# Jagorar Deploy - School System (Kyauta/Free)

## Abinda aka gyara a code (kafin deploy)
1. Cire hardcoded database password daga `db.js` — yanzu yana karanto daga `.env` kaɗai.
2. Cire placeholder Paystack key a `routes/website.js` — yanzu yana amfani da `.env`.
3. Cire hardcoded `localhost:3000` a `routes/admin.js` (admission letter PDF) — yanzu yana amfani da local file path, don haka zai yi aiki ko'ina.
4. Ƙara `"start": "node app.js"` a `package.json` (Render yana bukatar wannan don ya kunna app ɗinka).
5. Ƙara `.gitignore` domin kada `.env`, `node_modules`, da hotunan dalibai (`uploads/photos`) su tafi GitHub.
6. Ƙara `app.set('trust proxy', 1)` a `app.js` domin session/cookies suyi aiki daidai bayan HTTPS proxy na Render.
7. Ƙara `render.yaml` domin sauƙin one-click deploy.

## ⚠️ Abubuwan da ka kamata ka sani (Muhimmi)
- **Render free tier baya ajiye files na dindindin.** Duk hoton da aka upload ta hanyar form (passport photos) za su ɓace idan an sake deploy ko idan service ya "sleep" sannan ya farka. Idan kana bukatar hotunan su dawwama, za mu bukaci mu haɗa da Cloudinary (kyauta) don ajiye hotuna maimakon local disk — gaya mani idan kana son wannan.
- **Puppeteer (PDF generation) na iya cinye RAM da yawa.** Render free tier yana da 512MB RAM kawai. Idan generate na PDF (admission letter/receipt) ya kasa aiki lokaci-lokaci saboda "out of memory", wannan shine dalili — za mu iya inganta shi idan haka ya faru.
- Render free web service yana "barci" bayan minti 15 na rashin amfani, sannan yana ɗaukar ~30-50 seconds kafin ya farka lokacin da wani ya buɗe site ɗin.

## ✅ Mataki 1: Database Schema — AN GAMA
Ka riga ka fitar da `school_db_backup.sql` daga MySQL Workbench. Yana da tables 12 (users, students, applications, classes, subjects, teachers, results, attendance, payments, fee_types, sessions, promotions) tare da admin account naka na farko.

## Mataki 2: Samun Free TiDB Cloud Database
1. Je zuwa https://tidbcloud.com sannan ka yi sign up (kyauta, babu credit card, za ka iya amfani da Google/GitHub account).
2. Bayan ka shiga, danna **"Create Cluster"**.
3. Zaɓi **"Starter"** (wannan shine tsohon "Serverless" — free tier, 5GB storage, babu lokacin ƙarewa).
4. Ba wa cluster ɗinka suna (misali `school-system-db`), zaɓi region kusa da kai (misali Frankfurt/AWS eu-central ko US), sannan danna **Create**.
5. Bayan cluster ya shirya (sakanni kaɗan), danna **"Connect"**.
6. Za ka ga bayanan haɗi (connection details):
   - **Host** (misali `gateway01.eu-central-1.prod.aws.tidbcloud.com`)
   - **Port**: `4000`
   - **Username** (misali `xxxxxxx.root` — TiDB yana ƙara wani prefix a gaban `root`, tabbatar ka kwafi cikakken sunan)
   - **Password**: danna "Generate Password" idan baka riga ka saita ba, ka kwafi shi nan take (ba za ka sake ganin sa ba)
   - **Database**: za mu ƙirƙiri `school_db` mu kanmu a mataki na 3.

## Mataki 3: Shigar da Schema/Data (Import) zuwa TiDB Cloud
1. A cikin TiDB Cloud console, danna kan cluster ɗinka sannan zaɓi tab **"SQL Editor"** (ko "Chat2Query").
2. Fara da ƙirƙirar database:
   ```sql
   CREATE DATABASE school_db;
   ```
3. Domin shigar da fayil `school_db_backup.sql` gaba ɗaya, mafi sauƙi shine amfani da MySQL Workbench naka:
   - A MySQL Workbench, ƙirƙiri **sabon connection** (danna alamar '+' kusa da "MySQL Connections"):
     - Connection Name: `TiDB Cloud`
     - Hostname: (host ɗin da ka samu daga TiDB)
     - Port: `4000`
     - Username: (username ɗin TiDB, misali `xxxxxxx.root`)
     - A ƙarƙashin "SSL" tab, saita SSL Mode zuwa **"Require"**
   - Danna Test Connection, shigar da password, tabbatar ya haɗu.
   - Bude connection ɗin, sannan zaɓi database `school_db` da ka ƙirƙira.
   - Je zuwa **Server → Data Import**, zaɓi "Import from Self-Contained File", zaɓi fayil `school_db_backup.sql`, zaɓi target schema `school_db`, sannan danna **Start Import**.
4. Bayan ya gama, tabbatar tables sun bayyana a cikin `school_db` akan TiDB Cloud (refresh Schemas panel).

## Mataki 4: Push Code zuwa GitHub
```
cd school-system
git init
git add .
git commit -m "Initial commit - ready for deploy"
```
Sannan ƙirƙiri sabon repo a GitHub.com, sannan:
```
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

## Mataki 5: Deploy akan Render.com
1. Je zuwa https://render.com sannan yi sign up da GitHub account ɗinka (kyauta, babu credit card).
2. Danna "New +" → "Web Service".
3. Zaɓi repo ɗin da ka push.
4. Render zai gano `render.yaml` naka atomatik. Idan a'a, saita da hannu:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. A ƙarƙashin "Environment Variables", saka wannan (daga TiDB Cloud + Paystack dashboard):
   - `DB_HOST` (daga TiDB Cloud)
   - `DB_PORT` = `4000`
   - `DB_USER` (cikakken username daga TiDB Cloud, misali `xxxxxxx.root`)
   - `DB_PASSWORD` (daga TiDB Cloud)
   - `DB_NAME` = `school_db`
   - `DB_SSL` = `true`
   - `PAYSTACK_SECRET_KEY`
   - `PAYSTACK_PUBLIC_KEY`
   - `SESSION_SECRET` (kowace dogon random string)
6. Danna "Create Web Service". Render zai fara build ɗin, bayan minti 2-5 site ɗinka zai kasance live akan wani URL kamar `https://school-system-xxxx.onrender.com`.

## Mataki 6: Tabbatar Admin Login yana Aiki
Domin database ɗinka ya riga ya ƙunshi admin account (`admin@school.com`), sai kawai ka gwada shiga (login) kai tsaye a site ɗin da ya tafi live. Idan baka tuna password ɗin ba, gudanar da wannan a Render Shell tab:
```
npm run seed:admin
```
Wannan zai sake ƙirƙirar admin: `admin@school.com` / `admin123` — **ka canza password nan take bayan login!**

## Mataki 8: Sabbin Gyare-gyare (SEO, Email, Live Payment)

### 8a. SEO
An ƙara meta tags (description, keywords, Open Graph) akan dukkan pages 13 na website ɗinka, kuma an ƙirƙiri `robots.txt` da `sitemap.xml`.
**Muhimmi:** Bayan ka samu ainihin domain ɗinka (ko dai Render URL kamar `school-system-xxxx.onrender.com` ko custom domain), dole ne ka canza `your-domain-here.com` a wannan fayiloli zuwa ainihin domain ɗinka:
- Dukkan fayiloli a `public/website/*.html` (a cikin `<link rel="canonical">` da `og:url` tags)
- `public/robots.txt`
- `public/sitemap.xml`

Gaya mani domain ɗinka na ƙarshe bayan deploy, zan iya sauƙaƙe wannan canji domin ka.

### 8b. Contact Page Email
Contact form yanzu yana aika ainihin email zuwa Gmail ɗinka lokacin da wani ya cika form ɗin. Domin wannan ya yi aiki:
1. Je zuwa Gmail account ɗin da za a yi amfani da shi (Google Account Settings → Security).
2. Kunna **2-Step Verification** idan baka riga ka kunna ba (dole ne domin App Password ya bayyana).
3. Je zuwa https://myaccount.google.com/apppasswords, ƙirƙiri sabon App Password (zaɓi "Mail" a matsayin app), sannan kwafi password ɗin guda 16-characters da aka bayar.
4. A Render environment variables, ƙara:
   - `GMAIL_USER` = imel ɗinka na Gmail (misali `yourschool@gmail.com`)
   - `GMAIL_APP_PASSWORD` = 16-character password da ka samu (BA password na Gmail na yau da kullum ba)
5. Duk message da mutum ya aika ta Contact Page zai zo cikin wannan Gmail inbox ɗin, tare da sunan mai aikawa, waya, da email a matsayin "Reply-To" (za ka iya amsa kai tsaye).

### 8c. Live Payment (Ainihin Kuɗi)
Domin karɓar ainihin kuɗi (ba test ba):
1. Je zuwa Paystack dashboard ɗinka → Settings → API Keys & Webhooks.
2. Tabbatar account ɗinka an "activate" shi don karɓar live payment (Paystack yakan bukaci KYC/business verification kafin ka iya amfani da live keys).
3. Kwafi **Live Secret Key** (fara da `sk_live_...`) da **Live Public Key** (fara da `pk_live_...`).
4. A Render environment variables, canza:
   - `PAYSTACK_SECRET_KEY` → sabon `sk_live_...`
   - `PAYSTACK_PUBLIC_KEY` → sabon `pk_live_...`
5. Bayan wannan canji, duk payment da aka yi akan site ɗinka za su zama ainihin kuɗi na gaske, ba test ba.

### 8d. Message bayan Application/Registration
Bayan wani ya cika application form (ko ta hanyar real payment ko test mode), yanzu za a nuna masa wannan message a turance:
> "Please wait 2 days, then come back and check your admission status using the 'Check Status' tab above."

Wannan zai bayyana nan take a shafin `apply.html` bayan an gama submit, don sanar da mai nema ya jira kwana 2 kafin ya duba admission dinsa.

