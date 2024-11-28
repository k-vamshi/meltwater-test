import { Router } from 'express';
import dbClient from "db.ts"

const emailRouter = Router()

const createValues = (messages, client_id, status) => {
  let res = ""
  messages.forEach((val) => res.concat(`(${val.id}, ${client_id}, ${val.body}, ${Date.now()}, ${status === 'now' ? Date.now() : "NULL"})`)).join(', ')
  return res
  // send (id, client_id, message, date_requested, date_sent)
}

const createInserts = (messages, client_id, status) => {
  let res = ""
  messages.forEach((val) => res.concat(`()`))
  return res
  // send ($1, $2, $3, $4, $5)
}



const sendEmails = async (req: Request, res: Response) => {

  const {client_id: clientId, messages} = req.body
  try {
    await dbClient.query('BEGIN');
    const {rows } = dbClient.query('SELECT count FROM client WHERE client_id = $1;', [clientId])
    const currentCount = rows[0].count;
    
    if (currentCount <= 300) {
      const sendableMessages = messages.slice(0, 300 - currentCount)
      await sendMail(sendableMessages);
      
      const sentMessages = createValues(sendableMessages)
      const {rows} = dbClient.query(`INSERT emails (id, client_id, message, date_requested, date_sent)
          SET VALUES ($1, $2, $3, $4, Date.Now()), (), ()'`, [createValues(sentMessages, clientId, 'now')] )

      const unsentMessages = messages.slice(currentCount, messages.length - 1)
      if (unsentMessages.length) {
        const {rows} = dbClient.query(`INSERT emails (id, client_id, message, date_requested, date_sent)
          SET VALUES ($1, $2, $3, $4, Date.Now()), (), ()'`, [createValues(unsentMessages, clientId, 'later')] )
      }
    } else {
      const allMessages = createValues(messages)
      const {rows} = dbClient.query(`INSERT emails (id, client_id, message, date_requested, date_sent)
          SET VALUES ($1, $2, $3, $4, Date.Now()), (), ()'`, [allMessages] )
    }
    await dbClient.query('COMMIT')

    res.status(200).json({ message: "Messages processes" });
  }
  catch (error) {
    await dbClient.query('ROLLBACK')
    res.status(500).json({ message: "Messages unable to process" });
  }
}

emailRouter.post("/emails", sendEmails)
export { emailRouter };