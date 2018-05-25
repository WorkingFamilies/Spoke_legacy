import { r } from '../server/models'
import { sqlString as SQL } from '../lib'
import { sendEmail } from '../server/mail'
import moment from 'moment'
import { groupBy } from 'lodash'

(async () => {
  try {
    const today = moment().format('dddd, MMM Do')
    const allowedRoles = [
      'OWNER',
      'ADMIN',
      'SUPERVOLUNTEER'
    ]

    const users = await r.knex('user_organization')
      .distinct(r.knex.raw(SQL`
          o.id AS organization_id,
          initcap(o.name) AS organization_name,
          u.id AS user_id,
          u.first_name AS user_first_name,
          u.first_name || u.last_name AS user_name,
          u.email AS user_email
      `))
      .join('user AS u', 'u.id', 'user_id')
      .join('organization AS o', 'o.id', 'organization_id')
      .whereIn('role', allowedRoles)

    const orgUserGroups = groupBy(users, 'organization_id')

    await Promise.all(Object.keys(orgUserGroups).map(async orgId => {
      const campaignResults = await r.knex.select(r.knex.raw(SQL`
        c.title AS campaign,
        c.description,
        texters,
        texts_sent,
        replies,
        total_texts,
        opt_outs,
        ROUND((((texters * 1) / 30)  + (total_texts * .0075)), 2) AS cost,
        (SELECT array_to_json(array_agg(row_to_json(t))) FROM (
          SELECT campaign_id,
            question,
            value AS answer,
            COUNT(DISTINCT campaign_contact_id)
          FROM interaction_step AS i
          INNER JOIN question_response AS r ON r.interaction_step_id = i.id
          WHERE i.campaign_id = c.id
          AND r.created_at >= '2018-05-22'
          GROUP BY 1,2,3
        ) AS t) AS responses
        FROM campaign AS c
        INNER JOIN (
          SELECT campaign_id,
            COUNT(DISTINCT user_id) AS texters,
            SUM(CASE WHEN is_from_contact = 'f' THEN 1 ELSE 0 END) AS texts_sent,
            SUM(CASE WHEN is_from_contact = 't' THEN 1 ELSE 0 END) AS replies,
            COUNT(*) AS total_texts,
            COUNT(DISTINCT o.id) AS opt_outs
          FROM assignment AS a
          INNER JOIN message AS m ON m.assignment_id = a.id
            AND m.created_at >= '2018-05-22'
          LEFT JOIN opt_out AS o ON o.assignment_id = a.id
            AND o.created_at >= '2018-05-22'
          GROUP BY 1
        ) AS m ON m.campaign_id = c.id
        WHERE c.organization_id = ${orgId}
      `))

      const userGroup = orgUserGroups[orgId]
      const orgName = userGroup[0].organization_name

      let html = `<p>Hi ${userGroup[0].user_first_name},`
        + 'there are no Spoke results to report for today...</p>'

      if (campaignResults.length) {
        const campaignTables = campaignResults.map(({
          campaign, description, responses, ...results
        }) => {
          let responseHTML = 'No question answers'
          if (responses && responses.length) {
            const questionGroup = groupBy(responses, 'question')
            responseHTML = Object.keys(questionGroup).map((question) => (`
              <div style="overflow-x:auto;width:100%">
                <div><b>Question:</b> ${question}</div>
                <table>
                  <tr>
                    ${questionGroup[question].map(({ answer }) => (`
                      <th style="width: 100px">${answer}</th>
                    `)).join(' ')}
                  </tr>
                  <tr>
                    ${questionGroup[question].map(({ count }) => (`
                      <td style="text-align:center">
                        ${count}
                      </td>
                    `)).join(' ')}
                  </tr>
                </table>
              </div>
            `)).join('<br>')
          }

          return (`
            <div>
              <div><b>${campaign}</b></div>
              <div><em>${description}</em></div>
              <br>
              <table style="width:600px">
                <tr>
                  <th>Texters</th>
                  <th>Texts Sent</th>
                  <th>Replies</th>
                  <th>Total Texts</th>
                  <th>Opt Outs</th>
                  <th>Cost</th>
                </tr>
                <tr>
                  <td style="text-align:center">${results.texters}</td>
                  <td style="text-align:center">${results.texts_sent}</td>
                  <td style="text-align:center">${results.replies}</td>
                  <td style="text-align:center">${results.total_texts}</td>
                  <td style="text-align:center">${results.opt_outs}</td>
                  <td style="text-align:center">$${results.cost}</td>
                </tr>
              </table>
              <br>
              <div>${responseHTML}</div>
            </div>
          `)
        })

        html = `
          <p>
            Hi ${userGroup[0].user_first_name},
            here are the Spoke texting results from today by campaign:
          </p>
          <p>${campaignTables.join('<br><br><br>')}</p>
        `
      }

      return sendEmail({
        to: 'cjgordon@gmail.com',
        subject: `Texting results for ${orgName} – ${today}`,
        html
      })
    }))


    process.exit()
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
})()
