# Gestionale Ricerca — Manuale Operativo Rapido

> Università Telematica Pegaso — Sistema di Gestione Progetti di Ricerca

---

## Accesso al sistema

1. Aprire il browser e navigare su **http://localhost:5173** (o l'indirizzo fornito dall'ateneo)
2. Inserire email e password
3. Cliccare **Accedi**

> La sessione dura 8 ore. Alla scadenza il sistema reindirizza automaticamente alla pagina di login.

---

## Cosa puoi fare in base al tuo ruolo

| Funzione | Ricercatore | PI | Amministrativo | Management / Monitor | Superadmin |
|---|:---:|:---:|:---:|:---:|:---:|
| Vedere i propri progetti | ✓ | ✓ | ✓ | ✓ | ✓ |
| Vedere tutti i progetti | — | — | ✓ | ✓ | ✓ |
| Inserire timesheet | ✓ | ✓ | — | — | — |
| Approvare timesheet | — | ✓ | ✓ | — | ✓ |
| Creare / modificare progetti | — | — | ✓ | — | ✓ |
| Gestire budget e spese | — | — | ✓ | — | ✓ |
| Gestire SAL | — | — | ✓ | — | ✓ |
| Gestire personale | — | — | ✓ | — | ✓ |
| Esportare report | — | ✓* | ✓ | — | ✓ |
| Configurazione sistema | — | — | — | — | ✓ |

*\* Il PI può esportare solo i report dei propri progetti*

> **PI** non è un ruolo di sistema ma una funzione: un ricercatore diventa PI di un progetto quando viene allocato con il flag "PI" attivo.

---

## Ricercatore

### Inserire un timesheet mensile

1. Menu laterale → **Timesheet**
2. Cliccare **Nuovo timesheet**
3. Selezionare il progetto, il mese e l'anno
4. Compilare le ore giornaliere nella griglia
5. Cliccare **Salva bozza** per salvare senza inviare, oppure **Invia** per sottoporre all'approvazione del PI

> Un timesheet inviato non può essere modificato finché non viene rifiutato dal PI.

### Correggere un timesheet rifiutato

1. Menu laterale → **Timesheet**
2. Cliccare sul timesheet con stato **Rifiutato**
3. Leggere il motivo del rifiuto
4. Modificare le ore e cliccare **Invia**

### Visualizzare i propri progetti

1. Menu laterale → **Dashboard**
2. La sezione "Progetti in cui partecipi" mostra i progetti attivi
3. Cliccare su un progetto per aprirne la scheda

---

## PI (Principal Investigator)

### Approvare o rifiutare un timesheet

1. Comparirà una notifica (campanella in alto a destra) quando un membro del team invia un timesheet
2. Menu laterale → **Timesheet**
3. Filtrare per stato **Inviato**
4. Aprire il timesheet, verificare le ore
5. Cliccare **Approva** oppure **Rifiuta** (inserire il motivo in caso di rifiuto)

> Il PI non può approvare il proprio timesheet.

### Visualizzare il cruscotto del progetto

1. Menu laterale → **Dashboard**
2. Cliccare sulla scheda del progetto
3. Si apre il dettaglio con:
   - **Tachimetro Rendicontato/Pianificato** — percentuale di budget rendicontato sul totale pianificato
   - **Tachimetro Speso/Finanziato** — spese registrate rispetto al contributo ricevuto
   - **Tachimetro Tempo** — percentuale di durata trascorsa
   - Budget per voce di costo, SAL, timesheet pendenti

### Esportare il report del progetto

1. Aprire la scheda del progetto (menu **Progetti** → cliccare il progetto)
2. In alto a destra → bottone **Genera Report**
3. Scegliere **PDF** o **Excel**
4. Il file viene scaricato automaticamente

---

## Amministrativo

### Creare un nuovo progetto

1. Menu laterale → **Progetti** → bottone **Nuovo progetto**
2. Completare il wizard in 3 step:
   - **Step 1 — Anagrafica**: codice, titolo, acronimo, tipo, riferimento bando, date, importi
   - **Step 2 — Finanziamento**: finanziatore, voci di costo e importi previsti
   - **Step 3 — Riepilogo**: verifica e conferma
3. Il progetto viene creato in stato **Bozza**

### Attivare un progetto

1. Menu laterale → **Progetti**
2. Cliccare sul progetto in stato Bozza
3. In alto a destra → bottone **Attiva progetto**
4. Confermare

> L'attivazione sincronizza automaticamente il progetto con il sistema Missioni & Rimborsi.

### Modificare un progetto attivo

1. Menu laterale → **Progetti** → aprire il progetto
2. Cliccare l'icona **Modifica** (matita) in alto a destra
3. Si apre il drawer di modifica con le tab: Anagrafica, Allocazioni, WP, Spese, Partner
4. Modificare i campi desiderati e cliccare **Salva**

### Allocare personale a un progetto

1. Aprire il progetto → **Modifica** → tab **Allocazioni**
2. Cliccare **Aggiungi allocazione**
3. Selezionare la persona, inserire le ore assegnate, le date e spuntare **PI** se è il responsabile scientifico
4. Cliccare **Salva**

> Possono essere allocati solo ricercatori e amministrativi. Management, monitor e superadmin sono esclusi.

### Registrare una spesa

1. Aprire il progetto → tab **Spese**
2. Cliccare **Nuova spesa**
3. Compilare: voce di costo, importo, data, descrizione, eventuale allegato
4. Cliccare **Salva**

### Gestire i SAL

1. Aprire il progetto → tab **SAL**
2. Cliccare su un SAL per aprirne il dettaglio
3. Azioni disponibili in base allo stato:
   - **Aperto** → Chiudi SAL
   - **Chiuso** → Invia al finanziatore
   - **Contestato** → torna in lavorazione
   - **Inviato** → Rendiconta (inserire importo erogato)

### Aggiungere un nuovo membro del personale

1. Menu laterale → **Personale** → bottone **Nuova persona**
2. Compilare: nome, cognome, email, ruolo, livello contratto, data inizio servizio
3. Inserire una password iniziale
4. Cliccare **Salva**

> Per ricercatori e amministrativi, l'utente viene creato automaticamente anche nel sistema Missioni & Rimborsi con le stesse credenziali.

### Reimpostare la password di un utente

1. Menu laterale → **Personale** → aprire la scheda della persona
2. Cliccare **Reimposta password**
3. Inserire la nuova password (minimo 8 caratteri) e confermarla
4. Cliccare **Salva**

---

## Portfolio progetti

1. Menu laterale → **Portfolio**
2. Vista aggregata di tutti i progetti attivi con:
   - KPI globali (costo totale, finanziato, spese, % rendicontato)
   - Barra **Finanziato vs Speso** per ogni progetto
   - Barra **Pianificato vs Rendicontato** per ogni progetto
3. Cliccare la freccia ▶ a sinistra di una riga per espandere il dettaglio
4. Cliccare il codice del progetto per aprirne la scheda completa

---

## Notifiche

- La **campanella** in alto a destra mostra le notifiche non lette
- Le notifiche urgenti appaiono in rosso
- Cliccare su una notifica per andare direttamente all'elemento interessato
- Cliccare **Segna tutte come lette** per azzerare il contatore

---

## Domande frequenti

**Non riesco ad approvare il mio timesheet**
Il PI non può approvare il proprio timesheet. Deve farlo un altro PI o un amministrativo.

**Ho inviato un timesheet per errore**
Contattare il PI o l'amministrativo del progetto per farlo rifiutare. Una volta rifiutato potrai modificarlo.

**Non vedo il bottone "Attiva progetto"**
Solo gli amministrativi e il superadmin possono attivare i progetti. Se non hai il pulsante non hai i permessi necessari.

**Non trovo un progetto nella lista**
I ricercatori vedono solo i progetti a cui sono allocati. Se il progetto non compare, contattare l'amministrativo per verificare l'allocazione.
