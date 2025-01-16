import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DraftType, Prisma } from '@prisma/client';
import { ProjectRepository } from './project.repository';
import { MESSAGES } from 'src/constants';

@Injectable()
export class ProjectDraftService {
  constructor(private readonly projectRepository: ProjectRepository) {}
  private readonly logger = new Logger();
  draftType = {
    projectDetails: DraftType.PROJECT_DETAILS,
    documents: DraftType.DOCUMENT,
    provider: DraftType.ADD_PROVIDER,
    milestones: DraftType.MILESTONES,
    individualProvider: DraftType.ADD_IP,
  };

  async saveDraft(body): Promise<string> {
    try {
      for (const key in body) {
        if (body.hasOwnProperty(key)) {
          // Check if the property is an own property of the object
          if (this.draftType[key]) {
            if (!this.saveDraftValidation(body[key], this.draftType[key])) {
              throw new BadRequestException(
                'some keys are missing from the body',
              );
            }
            const data: Prisma.DRAFTSUncheckedCreateInput = {
              projectId: body.projectId,
              draftType: this.draftType[key],
              value: body[key],
            };
            await this.projectRepository.addDraft({ data });
          }
        }
      }
      return MESSAGES.SUCCESS.DRAFT.ADD;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  saveDraftValidation(body, draftType): boolean {
    if (draftType === DraftType.DOCUMENT) {
      const checkKeys = ['documentLinks'];
      return this.checkKeysExist(body, checkKeys);
    }
    return true;
  }

  async deleteDraft(projectId): Promise<string> {
    try {
      await this.projectRepository.deleteDraft({
        where: {
          projectId,
          deleted: {
            not: null,
          },
        },
      });
      return MESSAGES.SUCCESS.DRAFT.DELETED;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  //not using it for now
  restructureDraft(drafts) {
    const restructureDraftArray = [];
    for (const draft of drafts) {
      const draftKey = this.findKeyByValue(this.draftType, draft.draftType);
      restructureDraftArray.push({
        [draftKey]: draft.value,
      });
    }
    return restructureDraftArray;
  }

  findKeyByValue(object, value) {
    for (const key in object) {
      if (object.hasOwnProperty(key) && object[key] === value) {
        return key;
      }
    }
    return null; // Return null if the value is not found in the object
  }

  checkKeysExist(object, keysToCheck) {
    for (const key of keysToCheck) {
      if (!object.hasOwnProperty(key)) {
        return false; // If any key is missing, return false
      }
    }
    return true; // If all keys exist, return true
  }
}
