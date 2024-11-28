// We can add a CRON job that runs above function at midnight every day

import dbClient from './db';

const mailsJob = async () => {
  try {
    const clients = await dbClient.query('SELECT client_id FROM client;');

    for (let client of clients.rows) {
      const clientId = client.client_id;

      // Reset the email count for each client
      await dbClient.query('UPDATE client SET count = 0 WHERE client_id = $1', [clientId]);

      // Send any queued emails if there are less than 300
      const { rows: pendingEmails } = await dbClient.query(`
        SELECT * FROM emails 
        WHERE client_id = $1 AND date_sent IS NULL 
        LIMIT 300`, [clientId]);

      if (pendingEmails.length > 0) {
        await sendMail(pendingEmails);

        // set emails as sent
        const emailIds = pendingEmails.map(email => email.id);
        await dbClient.query(`
          UPDATE emails 
          SET date_sent = $1 
          WHERE id in Array(emailIds))`, [Date.now(), emailIds]);

        // increment count with pending count
        await dbClient.query('UPDATE client SET count = $2 WHERE client_id = $1', [clientId, pendingEmails.length]);
      }
    }
  } catch (error) {
    console.error("Error during cron job:", error);
  }
};
