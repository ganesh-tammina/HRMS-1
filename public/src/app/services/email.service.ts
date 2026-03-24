import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
	providedIn: 'root'
})
export class EmailService {

	private beURL = `http://${environment.apiURL}/send-email`;
	// ✅ The candidate-facing app URL (used in email links)
	private candidateAppURL = `http://${environment.apiURL}`;

	constructor(private http: HttpClient) { }

	sendEmail(candidate: any): Observable<any> {
		console.log('Preparing to send email to candidate:', candidate);
		const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="en">
      <body>
        <p>Hello ${candidate.FirstName},</p>
        <p>We’re thrilled to welcome you as <b>${candidate.JobTitle}</b> at Tech Tammina!</p>
        <p>Please review your offer letter and confirm by <b>${candidate.JoiningDate}</b>.</p>
        <a href="${this.candidateAppURL}/candidate_status/${candidate.candidate_id || candidate.id}?name=${candidate.FirstName}" 
           style="background-color:#3498db;color:white;padding:10px 16px;text-decoration:none;border-radius:5px">
           View Offer
        </a>
        <p>Best Regards,<br/>Tech Tammina Hiring Team</p>
      </body>
      </html>
    `;

		const data = {
			to: candidate.Email || candidate.email,
			subject: `Welcome to Tech Tammina, ${candidate.FirstName || candidate.first_name}!`,
			text: `Hello ${candidate.FirstName}, your offer letter is ready. View it here: ${this.candidateAppURL}/candidate_status/${candidate.candidate_id || candidate.id}?name=${candidate.FirstName}`,
			html: `
<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">

<head>
	<title></title>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0"><!--[if mso]>
<xml><w:WordDocument xmlns:w="urn:schemas-microsoft-com:office:word"><w:DontUseAdvancedTypographyReadingMail/></w:WordDocument>
<o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml>
<![endif]--><!--[if !mso]><!--><!--<![endif]-->
	<style>
		* {
			box-sizing: border-box;
		}

		body {
			margin: 0;
			padding: 0;
		}

		a[x-apple-data-detectors] {
			color: inherit !important;
			text-decoration: inherit !important;
		}

		#MessageViewBody a {
			color: inherit;
			text-decoration: none;
		}

		p {
			line-height: inherit
		}

		.desktop_hide,
		.desktop_hide table {
			mso-hide: all;
			display: none;
			max-height: 0px;
			overflow: hidden;
		}

		.image_block img+div {
			display: none;
		}

		sup,
		sub {
			font-size: 75%;
			line-height: 0;
		}

		@media (max-width:520px) {
			.desktop_hide table.icons-inner {
				display: inline-block !important;
			}

			.icons-inner {
				text-align: center;
			}

			.icons-inner td {
				margin: 0 auto;
			}

			.mobile_hide {
				display: none;
			}

			.row-content {
				width: 100% !important;
			}

			.stack .column {
				width: 100%;
				display: block;
			}

			.mobile_hide {
				min-height: 0;
				max-height: 0;
				max-width: 0;
				overflow: hidden;
				font-size: 0px;
			}

			.desktop_hide,
			.desktop_hide table {
				display: table !important;
				max-height: none !important;
			}
		}
	</style><!--[if mso ]><style>sup, sub { font-size: 100% !important; } sup { mso-text-raise:10% } sub { mso-text-raise:-10% }</style> <![endif]-->
</head>

<body class="body" style="background-color: #FFFFFF; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
	<table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #FFFFFF;">
		<tbody>
			<tr>
				<td>
					<table class="row row-1" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-image: url('https://www.techtammina.com/wp-content/uploads/2025/09/email-header-bg.svg'); background-repeat: no-repeat; border-radius: 0; color: #000000; background-color: #2090cf; padding-left:20px; width: 500px; margin: 0 auto;" width="500">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top;">
													<table class="image_block block-1" width="100%" border="0" cellpadding="5" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<div class="alignment" align="left">
																	<div style="max-width: 250px;"><img src="https://www.techtammina.com/wp-content/uploads/2022/04/techlogo.png" style="display: block; height: auto; border: 0; width: 100%;" width="250" alt title height="auto"></div>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table class="row row-2" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
						<tbody>
							<tr>
								<td>
									<table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; padding: 15px; width: 500px; margin: 0 auto;" width="500">
										<tbody>
											<tr>
												<td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top;">
													<table class="paragraph_block block-1" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad">
																<div style="color:#101112;direction:ltr;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:14px;font-weight:400;letter-spacing:0.2px;line-height:1.5;text-align:left;mso-line-height-alt:21px;">
																	<p style="margin: 0;">Hello ${candidate.FirstName},</p>
																</div>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-2" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad">
																<div style="color:#222222;direction:ltr;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:14px;font-weight:400;letter-spacing:0.2px;line-height:1.5;text-align:left;mso-line-height-alt:21px;">
																	<p style="margin: 0;">It was great interacting with you as part of our hiring process and we are excited to bring you onboard as&nbsp;${candidate.JobTitle}.</p>
																</div>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-3" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad">
																<div style="color:#222222;direction:ltr;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:14px;font-weight:400;letter-spacing:0.2px;line-height:1.5;text-align:left;mso-line-height-alt:21px;">
																	<p style="margin: 0;">We are just a few formalities away from getting down to work. Please have a look at the offer letter attached to this mail and indicate your agreement with these terms and accept the offer letter by signing/acknowledging on or before&nbsp; ${candidate.offerDetails?.DOJ || candidate.joining_date || candidate.JoiningDate || 'your joining date'}</p>
																</div>
															</td>
														</tr>
													</table>
													<table class="button_block block-4" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
															<div class="alignment" align="center"><a href="${this.candidateAppURL}/candidate_status/${candidate.candidate_id || candidate.id}?name=${candidate.FirstName}" target="_blank" style="color:#ffffff;text-decoration:none;"><!--[if mso]>
															<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"  href="${this.candidateAppURL}/candidate_status/${candidate.candidate_id || candidate.id}?name=${candidate.FirstName}"  style="height:48px;width:142px;v-text-anchor:middle;" arcsize="17%" fillcolor="#3498db">
															<v:stroke dashstyle="Solid" weight="0px" color="#3498db"/>
															<w:anchorlock/>
															<v:textbox inset="0px,0px,0px,0px">
															<center dir="false" style="color:#ffffff;font-family:sans-serif;font-size:16px">
															<![endif]--><span class="button" style="background-color: #3498db; border-bottom: 0px solid transparent; border-left: 0px solid transparent; border-radius: 8px; border-right: 0px solid transparent; border-top: 0px solid transparent; color: #ffffff; display: inline-block; font-family: Helvetica Neue, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; mso-border-alt: none; padding-bottom: 8px; padding-top: 8px; padding-left: 16px; padding-right: 16px; text-align: center; width: auto; word-break: keep-all; letter-spacing: normal;"><span style="word-break: break-word; line-height: 32px;">View offer</span></span><!--[if mso]></center></v:textbox></v:roundrect><![endif]--></a></div>
															</td>
														</tr>
													</table>
													<table class="paragraph_block block-5" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
														<tr>
															<td class="pad">
																<div style="color:#222222;direction:ltr;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:14px;font-weight:400;letter-spacing:0.2px;line-height:1.5;text-align:left;mso-line-height-alt:21px;">
																	<p style="margin: 0;">Regards,<br><br>Sree Tammina Software Solutions Pvt. Ltd.&nbsp;Hiring Team</p>
																</div>
															</td>
														</tr>
													</table>
													<table class="divider_block block-6" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
														<tr>
															<td class="pad">
																<div class="alignment" align="center">
																	<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
																		<tr>
																			<td class="divider_inner" style="font-size: 1px; line-height: 1px; border-top: 1px solid #222222;"><span style="word-break: break-word;">&#8202;</span></td>
																		</tr>
																	</table>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					
				</td>
			</tr>
		</tbody>
	</table><!-- End -->
</body>

</html>
`
		};

		return this.http.post<any>(this.beURL, data).pipe(
			tap((response) => {
				if (!response.success) {
					alert('❌ Failed to send email. Please try again.');
				}
			})
		);
	}
}
