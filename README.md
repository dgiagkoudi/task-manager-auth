# Task Manager Auth

Μια πλήρως λειτουργική εφαρμογή διαχείρισης εργασιών (To-Do List) με σύστημα εγγραφής, σύνδεσης, επαναφοράς κωδικού και ασφαλή αποθήκευση δεδομένων μέσω PostgreSQL & Prisma ORM.  
Αναπτύχθηκε με Node.js, Express και σύγχρονη responsive διεπαφή.

## Λειτουργίες

- Εγγραφή & Σύνδεση χρηστών με JWT Authentication

- Ασφαλής αποθήκευση δεδομένων με Prisma ORM & PostgreSQL

- Ανάκτηση / Επαναφορά κωδικού μέσω email (SMTP - Brevo)

- Προσθήκη, επεξεργασία & διαγραφή tasks 

## Τεχνολογίες

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js  
- Database: PostgreSQL  
- Deployment: Render  
- Email Service: Brevo

## Δομή φακέλων 
```text
task-manager-auth
├─ src/
│  ├─ controllers/
│  │    ├─ authController.js
│  │    └─ taskController.js
│  ├─ middlewares/
│  │    ├─ authMiddleware.js
│  │    └─ errorHandler.js
│  ├─ models/
│  │    └─ prismaClient.js
│  ├─ routes/
│  │    ├─ authRoutes.js
│  │    └─ taskRoutes.js
│  └─ index.js
```

## Εκκίνηση τοπικά
1. Κλωνοποίησε το repo:

git clone https://github.com/dgiagkoudi/task-manager-auth.git

cd task-manager-auth

2. Εγκατάστησε dependencies:

npm install

3. Δημιούργησε ένα .env αρχείο με τις παρακάτω μεταβλητές:

DATABASE_URL="postgresql://<user>:<password>@localhost:5432/<dbname>?schema=public"
JWT_SECRET="supersecretkey"
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
COOKIE_SECURE=false

SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT=587
SMTP_USER="9974e5001@smtp-brevo.com"
SMTP_PASS="<το_API_key_σου_από_Brevo>"
EMAIL_FROM="το_email_σου@domain.com"

4. Δημιούργησε και τρέξε τις migrations:

npx prisma migrate dev --name init

npx prisma generate

5. Εκκίνησε τον server:

npm start