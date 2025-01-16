import { Injectable } from '@nestjs/common';
import * as SendGrid from '@sendgrid/mail';
import { CONSTANT } from 'src/constants';
import { ConfigService } from '@nestjs/config';
import { configData } from '../config';

@Injectable()
export class EmailService {
  constructor(private readonly configService: ConfigService) {}

  config: any = configData(this.configService);

  async sendEmail(data, subject, mail_type, to_user, from_user = null) {
    try {
      from_user = from_user ? from_user : this.config.SENDGRID_EMAIL;

      const template = this.templateGenerator(
        to_user,
        from_user,
        data.path,
        data.token,
        mail_type,
      );
      SendGrid.setApiKey(this.config.SENDGRID_API_KEY);
      const msg = {
        to: to_user,
        from: this.config.SENDGRID_EMAIL,
        subject: subject,
        html: template,
      };
      SendGrid.send(msg)
        .then(() => {})
        .catch((error) => {});
      return true;
    } catch (error) {
      throw new Error('Error occurred while sending mail.');
    }
  }

  templateGenerator(to_user, from_user, path, token, mail_type) {
    let template = '';
    if (mail_type == CONSTANT.MAIL_TYPE.RESET_TOKEN) {
      template = `<div style="
       min-height: 474px;
       max-height: max-content;
            width: 676px;
            background: #10101c;
            color: rgb(255, 255, 255);
            border-radius: 8px;
            margin: auto;
          ">

        <div style=" padding: 40px;position: relative;">
            <div style="
                position: relative;
                    top: 20px;
                        /* Heading/H2/Medium 36px */
                        text-align: center;
                        font-family: 'Poppins';
                        font-style: normal;
                        font-weight: 500;
                        font-size: 30px;
                        line-height: 42px;
                      ">
                MO
            </div>
            <div style="
                position: relative;
                    top: 50px;
                        /* Sub-Heading/SH2/Medium 21px */
            
                        font-family: 'Poppins';
                        font-style: normal;
                        font-weight: 500;
                        font-size: 21px;
                        line-height: 30px;
                        /* or 143% */
            
                        text-align: center;
                        color: #BEBEBE
                      ">
                <p>Hi <span>${to_user}</span>,</p>
                <span>
                    We have recieved a <strong>'Reset Password'</strong> request for this email. Please
                    click this to change your password.
                </span>
                <span>
                    If you have not initiated this request, please reach out to
                    <a style="text-decoration: #10101c;" href="mailto:product@rejolut.com">MO Support</a> for
                    any
                    issues.
                </span>
                <p>
                    <br> <a style="display: inline-block;
                                width: 147px;
                    padding: 10px 10px;
                    text-align: center;
                    text-decoration: none;
                    color: #ffffff;
                    background-color: #9E62FF;
                    border-radius: 5px;
                    outline: none;" href="${this.config.FRONTEND_URL}${path}?token=${token}">Reset Password</a>
                </p></span>
            </div>
        </div>
    </div>
`;
    }
    if (mail_type == CONSTANT.MAIL_TYPE.NEW_USER) {
      template = `<div style="
       min-height: 474px;
       max-height: max-content;
            width: 676px;
            background: #10101c;
            color: rgb(255, 255, 255);
            border-radius: 8px;
            margin: auto;
          ">

        <div style=" padding: 40px;position: relative;">
            <div style="
                position: relative;
                    top: 20px;
                        /* Heading/H2/Medium 36px */
                        text-align: center;
                        font-family: 'Poppins';
                        font-style: normal;
                        font-weight: 500;
                        font-size: 30px;
                        line-height: 42px;
                      ">
                MO
            </div>
            <div style="
                position: relative;
                    top: 50px;
                        /* Sub-Heading/SH2/Medium 21px */
            
                        font-family: 'Poppins';
                        font-style: normal;
                        font-weight: 500;
                        font-size: 21px;
                        line-height: 30px;
                        /* or 143% */
            
                        text-align: center;
                        color: #BEBEBE
                      ">
                <p>Hi <span>${to_user}</span>,</p>
                <span>
                    ${from_user} has sent you an<strong>'Invitation'</strong> request for this email. Please
                    click this to initiate registeration.
                </span>
                <span>
                    If you have want to stop the invite requests, please reach out to
                    <a style="text-decoration: #10101c;" href="mailto:product@rejolut.com">MO Support</a> for
                    any
                    issues.
                </span>
                <p>
                    <br> <a style="display: inline-block;
                                width: 147px;
                    padding: 10px 10px;
                    text-align: center;
                    text-decoration: none;
                    color: #ffffff;
                    background-color: #9E62FF;
                    border-radius: 5px;
                    outline: none;" href="${this.config.FRONTEND_URL}${path}">Signup Now</a>
                </p></span>
            </div>
        </div>
    </div>
`;
    }
    if (mail_type == CONSTANT.MAIL_TYPE.PURCHASER_INVITE) {
      template = `<div style="
       min-height: 474px;
       max-height: max-content;
            width: 676px;
            background: #10101c;
            color: rgb(255, 255, 255);
            border-radius: 8px;
            margin: auto;
          ">

        <div style=" padding: 40px;position: relative;">
            <div style="
                position: relative;
                    top: 20px;
                        /* Heading/H2/Medium 36px */
                        text-align: center;
                        font-family: 'Poppins';
                        font-style: normal;
                        font-weight: 500;
                        font-size: 30px;
                        line-height: 42px;
                      ">
                MO
            </div>
            <div style="
                position: relative;
                    top: 50px;
                        /* Sub-Heading/SH2/Medium 21px */
            
                        font-family: 'Poppins';
                        font-style: normal;
                        font-weight: 500;
                        font-size: 21px;
                        line-height: 30px;
                        /* or 143% */
            
                        text-align: center;
                        color: #BEBEBE
                      ">
                <p>Hi <span>${to_user}</span>,</p>
                <span>
                    <p>${from_user} has sent you an<strong>'Invitation'</strong> request for this email. Please
                    click the below button to start collaborating with the user. </p>
                </span>
                <p>
                    <br> <a style="display: inline-block;
                                width: 147px;
                    padding: 10px 10px;
                    text-align: center;
                    text-decoration: none;
                    color: #ffffff;
                    background-color: #9E62FF;
                    border-radius: 5px;
                    outline: none;" href="${this.config.FRONTEND_URL}${path}?token=${token}">Collaborate Now</a>
                </p></span>
            </div>
        </div>
    </div>
`;
    }
    if (mail_type == CONSTANT.MAIL_TYPE.VERIFICATION_INVITE) {
      template = `<div style="
   min-height: 474px;
   max-height: max-content;
        width: 676px;
        background: #10101c;
        color: rgb(255, 255, 255);
        border-radius: 8px;
        margin: auto;
      ">

        <div style=" padding: 40px;position: relative;">
            <div style="
            position: relative;
                top: 20px;
                    /* Heading/H2/Medium 36px */
                    text-align: center;
                    font-family: 'Poppins';
                    font-style: normal;
                    font-weight: 500;
                    font-size: 30px;
                    line-height: 42px;
                  ">
                  MO
            </div>
            <div style="
            position: relative;
                top: 50px;
                    font-family: 'Poppins';
                    font-style: normal;
                    font-weight: 500;
                    font-size: 21px;
                    line-height: 30px;
                    /* or 143% */
                    padding-bottom: 20px;
                    text-align: center;
                    color: #BEBEBE
                  ">
                <p>Hi <span>${to_user}</span>,</p>

                <span>
                    <p>We are thrilled to have you as a new member of M.O ! We wanted to take a moment to extend
                        a warm welcome</p>
                    <p>As a new user, you now have access to list key features and services offered by us. If you have
                        any questions or need
                        assistance getting started, our support team is always available to help. Please reach out to
                        <a style="text-decoration: #10101c;" href="mailto:product@rejolut.com">MO Support</a> for
                        any
                        issues.</p>
                    <p>Thank you for choosing M.O </p>
                    <p>Best Regards,</p>
                    <p>Team M.O</p>
                </span>
                <p>
                    <br> <a style="display: inline-block;
                                width: 147px;
                    padding: 10px 10px;
                    text-align: center;
                    text-decoration: none;
                    color: #ffffff;
                    background-color: #9E62FF;
                    border-radius: 5px;
                    outline: none;" href="${this.config.FRONTEND_URL}${path}?token=${token}">Verify Email</a>
                </p></span>
            </div>
        </div>

    </div>`;
    }
    if (mail_type == CONSTANT.MAIL_TYPE.RESET_PASSWORD_OTP) {
      template = `<div style="
       min-height: 474px;
       max-height: max-content;
            width: 676px;
            background: #10101c;
            color: rgb(255, 255, 255);
            border-radius: 8px;
            margin: auto;
          ">

        <div style=" padding: 40px;position: relative;">
            <div style="
                position: relative;
                    top: 20px;
                        /* Heading/H2/Medium 36px */
                        text-align: center;
                        font-family: 'Poppins';
                        font-style: normal;
                        font-weight: 500;
                        font-size: 30px;
                        line-height: 42px;
                      ">
                MO
            </div>
            <div style="
                position: relative;
                    top: 50px;
                        /* Sub-Heading/SH2/Medium 21px */
            
                        font-family: 'Poppins';
                        font-style: normal;
                        font-weight: 500;
                        font-size: 21px;
                        line-height: 30px;
                        /* or 143% */
            
                        text-align: center;
                        color: #BEBEBE
                      ">
                <p>Hi <span>${to_user}</span>,</p>
                <span>
                    We have recieved a <strong>'Reset Password'</strong> request for this email. Your OTP is ${token} <br>
                </span>
                <span>
                    If you have not initiated this request, please reach out to
                    <a style="text-decoration: #10101c;" href="mailto:product@rejolut.com">MO Support</a> for
                    any
                    issues.
                </span>
               </span>
            </div>
        </div>
    </div>
`;
    }
    return template;
  }
}
