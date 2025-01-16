import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
  ObjectCannedACL,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { configData } from 'src/config';
import { CONSTANT, MESSAGES } from 'src/constants';
import * as fs from 'fs';
import axios from 'axios';
import { File } from '@web-std/file';
import { createCanvas, loadImage, registerFont } from 'canvas';

async function getWeb3(): Promise<any> {
  const module = await (eval(
    `import('@web3-storage/w3up-client')`,
  ) as Promise<any>);
  return module.create;
}

async function getSigner(): Promise<any> {
  const module = await (eval(
    `import('@ucanto/principal/ed25519')`,
  ) as Promise<any>);
  return module;
}

async function getDag(): Promise<any> {
  const module = await (eval(
    `import('@ucanto/core/delegation')`,
  ) as Promise<any>);
  return module.importDAG;
}

async function getCarReader(): Promise<any> {
  const module = await (eval(`import('@ipld/car')`) as Promise<any>);
  return module.CarReader;
}

@Injectable()
export class StorageService {
  constructor(private readonly configService: ConfigService) {}

  config: any = configData(this.configService);
  private logger = new Logger();

  s3Client = new S3Client({
    region: this.config.S3_REGION,
    credentials: {
      accessKeyId: this.config.S3_ACCESS_ID,
      secretAccessKey: this.config.S3_SECRET_ACCESS_KEY,
    }, // Use a profile from your AWS credentials file or provide your access key and secret key
  });

  async uploadFileToS3(file, key) {
    const bucketName = this.config.S3_BUCKET;
    const region = this.config.S3_REGION;
    const params = {
      Bucket: bucketName,
      Key: key, // The name of the file you want to upload to S3
      Body: file.buffer, // The file data as a Buffer, Blob, or ReadableStream
      // ACL: 'public-read',
      ACL: ObjectCannedACL.public_read,
      ContentType: file.mimetype,
    };
    try {
      const command = new PutObjectCommand(params);
      await this.s3Client.send(command);
      const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
      return fileUrl;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteFileFromS3(key) {
    const bucketName = this.config.S3_BUCKET;
    const params = {
      Bucket: bucketName,
      Key: key, // The name of the file you want to delete
    };

    try {
      const command = new DeleteObjectCommand(params);
      await this.s3Client.send(command);
      return `${MESSAGES.SUCCESS.FILE_DELETED}:${key}`;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async loadLocalFile(path: string, parse = null) {
    try {
      if (parse) {
        return fs.readFileSync(path, 'utf8');
      } else {
        return JSON.parse(fs.readFileSync(path, 'utf8'));
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async uploadToWeb3Storage(urls, project) {
    try {
      // const env_proof =
      //   process.env.NODE_ENV == 'prod'
      //     ? CONSTANT.PROD_WEB3_STORAGE_PROOF
      //     : CONSTANT.DEV_WEB3_STORAGE_PROOF;
      const env_proof = CONSTANT.DEV_WEB3_STORAGE_PROOF;
      const env_key = this.config.WEB3_STORAGE_KEY;
      const create = await getWeb3();
      const Signer = await getSigner();
      const principal = Signer.parse(env_key);
      const client = await create({ principal });

      // now give Agent the delegation from the Space
      const proof = await parseProof(env_proof);
      const space = await client.addSpace(proof);
      await client.setCurrentSpace(space.did());
      // Get File blob from url
      const files = [];
      for (const index in urls) {
        const url = urls[index];
        await axios
          .get(url, { responseType: 'arraybuffer' })
          .then((response) => {
            files.push(
              new File(
                [Buffer.from(response.data)],
                `${index}-${project.projectId}`,
              ),
            );
          });
      }

      // Load the MO logo file
      const response = await axios.get(CONSTANT.MO_LOGO, {
        responseType: 'arraybuffer',
      });

      // Generate the new image with projectId
      const newImageBuffer = await this.generateImageWithText(
        Buffer.from(response.data),
        project.title,
      );

      // Uploading the new MO NFT preview image to ipfs storage
      const cid: any = await client.uploadDirectory(files);
      const newImageCid = await client.uploadFile(
        new File([newImageBuffer], `MO-${project.projectId}`),
      );

      // Create metadata
      let metadata = {
        image: String(newImageCid),
        description: `The files related to this NFT -> "https://gateway.pinata.cloud/ipfs/${String(
          cid,
        )}"`,
        name: project.title,
        creator: project.creator,
        format: 'HIP412@2.0.0',
        attributes: [
          {
            trait_type: 'project_name',
            value: project.title,
          },
        ],
        type: 'image/png',
      };
      let metadataFile = new File(
        [Buffer.from(JSON.stringify(metadata).toString())],
        `metadata.json`,
      );

      const meta: any = await client.uploadFile(metadataFile);

      return String(meta);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async generateImageWithText(existingImageBuffer: Buffer, issuerDid: string) {
    try {
      // Load the existing image
      const image = await loadImage(existingImageBuffer);
      let scaledWidth = image.width / 4;
      let scaledHeight = image.height / 4;

      // Create a canvas with the same dimensions as the image
      const canvas = createCanvas(scaledWidth + 10, scaledHeight + 40);
      const ctx = canvas.getContext('2d');

      // Draw the image onto the canvas
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 5, 30, scaledWidth, scaledHeight);

      // Add text to the image
      ctx.font = '24px Arial'; // Adjust font size and family as needed
      ctx.fillStyle = 'white'; // Adjust text color as needed
      ctx.fillText(`${issuerDid}`, 5, 20, image.width); // Adjust position as needed

      // Convert the canvas to a Buffer (PNG format)
      const resultImageBuffer = canvas.toBuffer('image/png');

      return resultImageBuffer;
    } catch (error) {
      console.error('Error generating image with text:', error);
      throw error;
    }
  }
}
/** @param {string} data Base64 encoded CAR file */
async function parseProof(data) {
  const importDAG = await getDag();
  const CarReader = await getCarReader();
  const blocks = [];
  const reader = await CarReader.fromBytes(Buffer.from(data, 'base64'));
  for await (const block of reader.blocks()) {
    blocks.push(block);
  }
  return importDAG(blocks);
}
