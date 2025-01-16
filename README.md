<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->

<a name="readme-top"></a>

<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->

<!-- PROJECT LOGO -->
<br />
<div align="center">
<!--   <a href="https://github.com/github_username/repo_name">
    <img src="images/logo.png" alt="Logo" width="80" height="80">
  </a> -->

<h3 align="center">MO Backend</h3>

  <p align="center">
    <br />
    <a href="https://mo.neerhq.io/api"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://d2exqdk9aguliq.cloudfront.net/">View Demo</a>
    ·
    <a href="https://github.com/the-mo-net/mo-backend/issues">Report Bug</a>
    
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About The Project

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

Please follow the instructions to run the service on you local machine / setup on a server

### Prerequisites

Required system dependencies:

- Node version >= 18.17.0
- Npm version >= 9.6.7
- Operation Systems - Window / Linux

### Installation

1. Clone the repository and change the directory to the root of the source code.

   ```sh
   git clone https://github.com/the-mo-net/mo-backend.git
   ```

2. Install NPM packages.
   ```sh
   npm install
   ```
3. Set your API Keys in `.env` file.

   ```js
   DATABASE_URL =
     'postgresql://user_name:password@URL/database_name?schema=public'; // You can pull a docker image using < docker pull postgres> reference: https://hub.docker.com/_/postgres
   JWT_SECRET = 'set_a_secret_phrase_here'; //  Create any random phrase, make sure its STRONG, eg: aw3246e_123421r$21
   PORT = 'port_on_which_you_want_to_start the server'; // eg: 3000
   FRONTEND_URL = 'production_frontend_url'; // Use: https://d2exqdk9aguliq.cloudfront.net/
   BACKEND_URL = 'url_on_which_the_server_is_forwarded_to'; // Use: http://localhost:3000 for local
   GOOGLE_CLIENT_ID = 'get_this_id_from_GCP_console'; // You can get it from here: https://console.cloud.google.com/apis/credentials/
   GOOGLE_SECRET = 'get_this_secret_from_GCP_console'; // You can get it from here: https://console.cloud.google.com/apis/credentials/
   SENDGRID_API_KEY = 'key_from_sendgrid_email_service'; // Get it from here: https://docs.sendgrid.com/for-developers/sending-email/quickstart-nodejs
   SENDGRID_EMAIL =
     'default_email_on_which_the_sendgrid_email_service_is_registered'; // Get it from here: https://docs.sendgrid.com/for-developers/sending-email/quickstart-nodejs
   S3_REGION = 'AWS_s3_bucket_region'; // Your AWS Bucket region
   S3_BUCKET = 'AWS_s3_bucket_name'; // Your AWS Bucket name
   S3_ACCESS_ID = 'AWS_s3_access_id'; // Your AWS Access Id
   S3_SECRET_ACCESS_KEY = 'AWS_s3_secret_access_key'; // Your AWS Secret Access Key
   HEDERA_NETWORK = 'TESTNET' / 'MAINNET'; // Should be "TESTNET" for current sourcecode
   HEDERA_ACCOUNT_ID = 'hedera_account_id eg: 0.0.2084'; // HEDERA_ACCOUNT_ID from which the hedera calls will be made. For TESTNET you can create it here : https://portal.hedera.com/
   HEDERA_PUBLIC_KEY = 'hedera_public_key eg: 0298374847567528948735683493...'; // Reference: https://portal.hedera.com/
   HEDERA_PRIVATE_KEY =
     'hedera_private_key e.g: 234567663496827486789579806...'; // Reference : https://portal.hedera.com/
   EVM_ADDRESS = 'hedera_evm_address e.g: 0x21345675646746...'; // Refere : https://portal.hedera.com/
   HEX_ENCODED_PRIVATE_KEY =
     'hedera_encoded_private_key e.g:0x345243523437548469853....'; // Reference: https://portal.hedera.com/

   HEDERA_TESTNET_ENDPOINT = 'https://testnet.mirrornode.hedera.com';
   WEB3_TOKEN_NAME = 'mo-deev';
   WEB3_STORAGE = 'token_from_web3_storage_protal'; // Use: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweEM2OTJCNTEzYzRjNmNmZDFkRDQwOTZmNzczOEYxZjAzYTQ0NzExNDkiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2OTg2NTE2ODYxNzksIm5hbWUiOiJtby1kZXYifQ.NDITGafOGVh5iqvb8expGF0EDM_K06QSurap7tN0lI0,
   // As the new library released has issues using with module type: "commonJs" issue: https://github.com/web3-storage/w3up/issues/1209
   MQTT_CONN = 'mqtt://username:password@url:port'; // connection for MQTT Message Broker service. You can use free services from Hivemq etc.
   USDC_ADDRESS = '0x00000000000000000000000000000000005a0f77';
   LOGGER = '2'; // Use this to configure the logging levels. 2 = ['debug', 'error', 'log', 'verbose', 'warn'], 1 = ['error', 'warn'], 0 = disable logging
   ```

4. Database configuration.

   ```js
   npx prisma generate dev
   ```

5. Run Database migrations using
   ```js
   npx prisma migrate deploy
   ```
   <p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->

6. Build docker image

   ```sh
   docker build --build-arg DATABASE_URL="databse_url" -t mo-backend .
   docker run mo-backend:latest
   docker ps
   docker run -p 3000:3000 docker_image_id
   ```

## Usage

To start the service, run the following command as per needed:

```sh
npm run start        // To start the service
npm run start:dev    // To start the service in developement mode
```

_For more examples, please refer to the [Documentation](https://mo.neerhq.io/api)_

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->

<!-- LICENSE -->

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->

## Contact

Your Name - [@twitter_handle](https://twitter.com/twitter_handle) - email@email_client.com

Project Link: [https://github.com/the-mo-net/mo-backend](https://github.com/the-mo-net/mo-backend)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[contributors-shield]: https://img.shields.io/github/contributors/github_username/repo_name.svg?style=for-the-badge
[contributors-url]: https://github.com/github_username/repo_name/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/github_username/repo_name.svg?style=for-the-badge
[forks-url]: https://github.com/github_username/repo_name/network/members
[stars-shield]: https://img.shields.io/github/stars/github_username/repo_name.svg?style=for-the-badge
[stars-url]: https://github.com/github_username/repo_name/stargazers
[issues-shield]: https://img.shields.io/github/issues/github_username/repo_name.svg?style=for-the-badge
[issues-url]: https://github.com/github_username/repo_name/issues
[license-shield]: https://img.shields.io/github/license/github_username/repo_name.svg?style=for-the-badge
[license-url]: https://github.com/github_username/repo_name/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/linkedin_username
[product-screenshot]: images/screenshot.png
[Nest.js]: https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Nest-url]: https://nextjs.org/
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[Vue.js]: https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D
[Vue-url]: https://vuejs.org/
[Angular.io]: https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white
[Angular-url]: https://angular.io/
[Svelte.dev]: https://img.shields.io/badge/Svelte-4A4A55?style=for-the-badge&logo=svelte&logoColor=FF3E00
[Svelte-url]: https://svelte.dev/
[Laravel.com]: https://img.shields.io/badge/Laravel-FF2D20?style=for-the-badge&logo=laravel&logoColor=white
[Laravel-url]: https://laravel.com
[Bootstrap.com]: https://img.shields.io/badge/Bootstrap-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white
[Bootstrap-url]: https://getbootstrap.com
[JQuery.com]: https://img.shields.io/badge/jQuery-0769AD?style=for-the-badge&logo=jquery&logoColor=white
[JQuery-url]: https://jquery.com
