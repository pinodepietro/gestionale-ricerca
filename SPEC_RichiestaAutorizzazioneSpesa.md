# Specifica — Richiesta Autorizzazione alla Spesa
**Versione:** 1.0  
**Data:** 11/06/2026  
**Stato:** In attesa di approvazione

---

## 1. Contesto

Digitalizzazione del modulo cartaceo "Richiesta Autorizzazione alla Spesa" dell'Università Telematica Pegaso.  
Il modulo gestisce il flusso di approvazione per qualsiasi spesa su progetti di ricerca o fondi individuali.

---

## 2. Collocazione tecnica

- **Opzione B**: modulo integrato nel gestionale esistente (FastAPI + React)
- Nuova sezione "Autorizzazioni Spesa" nel menu laterale
- Stessa grafica, stesso login, stesso container Docker
- **Obiettivo futuro**: SSO unico per gestionale + missioni + eventuali altre app

---

## 3. Modifiche strutturali preliminari

### 3.1 Nuovo ruolo
Aggiunta del ruolo `direttore_generale` ai ruoli del gestionale.

### 3.2 Nuova tabella `Dipartimento`
| Campo | Tipo | Note |
|---|---|---|
| id | UUID | PK |
| nome | varchar(200) | obbligatorio |
| direttore_id | FK → Persona | obbligatorio |

### 3.3 Campo `dipartimento_id` su Progetto
Aggiunta FK `dipartimento_id → Dipartimento` al modello `Progetto`.

### 3.4 Modifica budget progetto — creazione voce personalizzata
Nel form di aggiunta voce al budget progetto, accanto al dropdown della lista globale `VoceDiCosto` si aggiunge l'opzione **"Crea nuova voce"** con i campi:
- Codice (es. "X.1")
- Descrizione (es. "Direct Cost")
- Categoria

La nuova voce viene inserita nella tabella globale `VoceDiCosto` e diventa disponibile per tutti i progetti futuri.

---

## 4. Modello dati — `RichiestaAutorizzazioneSpesa`

| Campo | Tipo | Obbligatorio | Note |
|---|---|---|---|
| id | UUID | ✓ | PK |
| tipo | enum | ✓ | `progetto` / `fondi_individuali` |
| progetto_id | FK → Progetto | no | null = fondi individuali |
| dipartimento_id | FK → Dipartimento | ✓ | dal progetto oppure scelto manualmente |
| richiedente_id | FK → Persona | ✓ | chiunque nel sistema |
| qualita_richiedente | enum | ✓ | `professore_ordinario` / `professore_associato` / `ricercatore` |
| tipo_contratto | enum | ✓ | `pieno` / `definito` |
| qualita_progetto | string | no | RS del progetto / componente gruppo di ricerca |
| macrocategoria | enum | ✓ | `personale` / `spese_generali` / `consulenze_servizi` / `strumentazioni` |
| voce_lettera | char | ✓ | a → u |
| voce_altro | string | no | testo libero se voce = h, m, p, u |
| oggetto | string | ✓ | descrizione sintetica |
| descrizione | string | ✓ | descrizione estesa |
| importo | decimal(14,2) | ✓ | in Euro |
| durata_da | date | no | solo Sezione 1 |
| durata_a | date | no | solo Sezione 1 |
| termini_pagamento | string | no | solo Sezione 1, opzionale |
| anticipazione_spesa | boolean | ✓ | sempre presente |
| allegato_voce_g | file path | condizionale | obbligatorio solo se voce = g |
| allegato_preventivo | file path | no | opzionale per Sezione 2 |
| budget_voce_id | FK → BudgetVoce | no | selezionato dall'admin al suo step |
| stato | enum | ✓ | vedi workflow §6 |
| motivazione_rigetto | string | no | obbligatorio in caso di rigetto |
| impegno_id | FK → Impegno | no | creato automaticamente all'approvazione DG |
| pdf_path | string | no | generato all'approvazione DG |
| created_at | timestamp | ✓ | |
| updated_at | timestamp | ✓ | |

---

## 5. Sezioni del modulo e campi per voce

### Sezione 1
**Voci:** a, b, c, d, e, f, h, i, j, k, n, o, p

| Campo | Obbligatorio |
|---|---|
| Oggetto | ✓ |
| Descrizione | ✓ |
| Importo | ✓ |
| Durata (dal / al) | no — solo per contratti e incarichi |
| Termini di pagamento | no — "compilare solo se rilevante" |

### Sezione 2
**Voci:** l, m, q, r, s, t, u

| Campo | Obbligatorio |
|---|---|
| Oggetto | ✓ |
| Descrizione | ✓ |
| Importo | ✓ |

### Sezione 3
**Voce:** g (Incentivazione Personale Docente)

- Allegato "Modulo richiesta incentivazione Personale Docente": **obbligatorio**

---

## 6. Workflow

### 6.1 Richiesta con progetto
```
BOZZA
  ↓ (richiedente invia)
ATTESA_AMMIN
  ← Responsabile Amministrativo del progetto (Allocazione.is_ammin)
  ← Seleziona BudgetVoce + verifica disponibilità
  ← BLOCCATO se disponibile < importo richiesto
  ↓
ATTESA_RS
  ← PI del progetto (Allocazione.is_pi)
  ↓
ATTESA_DIR_DIP
  ← Direttore del Dipartimento collegato al progetto
  ↓
ATTESA_DG
  ← Direttore Generale (ruolo direttore_generale)
  ↓ (crea Impegno + genera PDF)
APPROVATA
```

### 6.2 Richiesta fondi individuali (senza progetto)
```
BOZZA
  ↓ (richiedente invia + seleziona dipartimento manualmente)
ATTESA_DIR_DIP
  ← Direttore del Dipartimento selezionato
  ↓
ATTESA_DG
  ← Direttore Generale
  ↓ (genera PDF — nessun Impegno)
APPROVATA
```

### 6.3 Rigetto
- Qualsiasi approvatore può rigettare
- Motivazione obbligatoria
- Il richiedente riceve una notifica con la motivazione
- La richiesta torna in **BOZZA**
- Il richiedente può correggere e reinviare → il workflow riparte **dall'inizio**
- L'admin deve **riselezionare** la voce di budget ad ogni nuovo invio

---

## 7. Selezione voce di budget (step Admin)

Al momento dell'approvazione da parte del Responsabile Amministrativo, il sistema mostra tutte le BudgetVoci del progetto con:

```
Voce                          Disponibile      Richiesto    Stato
B.2 — Materiali di consumo    3.200,00 €       1.500,00 €   ✓ OK
C.1 — Servizi di ricerca        200,00 €       1.500,00 €   ⚠ Insufficiente
A.1 — Personale dipendente    8.400,00 €       1.500,00 €   ✓ OK
```

**Regola:** se la voce selezionata ha `disponibile < importo richiesto` → l'admin è **bloccato** su quella selezione e non può procedere.  
Può selezionare una voce diversa con disponibilità sufficiente e procedere con quella.

---

## 8. Azioni automatiche all'approvazione DG

1. **Generazione PDF** — modulo compilato (docxtpl + LibreOffice, stesso pattern missioni-app)
2. **Creazione Impegno** — solo se `tipo = progetto`:
   - `progetto_id` = progetto della richiesta
   - `voce_id` = voce di costo della `BudgetVoce` selezionata dall'admin
   - `importo` = importo della richiesta
   - `descrizione` = "Autorizzazione spesa — {oggetto}"
   - `data` = data di approvazione DG

---

## 9. Notifiche

| Evento | Destinatario | Contenuto |
|---|---|---|
| Richiesta inviata | Admin del progetto | Nuova richiesta da approvare |
| Approvazione Admin | PI del progetto | Richiesta in attesa della tua approvazione |
| Approvazione PI | Direttore Dipartimento | Richiesta in attesa della tua approvazione |
| Approvazione Dir.Dip. | Direttore Generale | Richiesta in attesa della tua approvazione |
| Approvazione DG | Richiedente | Richiesta approvata — PDF disponibile |
| Rigetto (qualsiasi step) | Richiedente | Richiesta rigettata — motivazione: {testo} |

---

## 10. Vincoli e regole di business

| Regola | Dettaglio |
|---|---|
| Chi può creare | Qualsiasi utente del gestionale |
| Vincolo progetto | Il progetto deve avere PI e Responsabile Ammin allocati — altrimenti la richiesta è bloccata alla creazione |
| Blocco disponibilità | L'admin non può approvare se la BudgetVoce selezionata ha disponibilità < importo richiesto. Può selezionare una voce diversa che abbia disponibilità sufficiente. |
| Nessun numero di protocollo | Non gestito internamente |
| Voce g | Allegato obbligatorio al momento della creazione |
| PDF | Generato solo all'approvazione finale DG |
| Impegno | Solo per richieste con progetto, all'approvazione DG |

---

## 11. Piano di implementazione (8 blocchi)

| Blocco | Contenuto |
|---|---|
| 1 | DB + modelli: tabella `Dipartimento`, `dipartimento_id` su Progetto, nuovo ruolo `direttore_generale`, tabella `RichiestaAutorizzazioneSpesa` |
| 2 | Budget progetto: opzione "Crea nuova voce" nel form |
| 3 | Backend CRUD richiesta + endpoint transizioni workflow |
| 4 | Backend: logica approvazione Admin (verifica disponibilità + blocco) |
| 5 | Backend: logica approvazione DG (crea Impegno + genera PDF) |
| 6 | Frontend: form creazione richiesta (sezioni dinamiche, campi condizionali) |
| 7 | Frontend: viste per ogni approvatore |
| 8 | Notifiche rigetto e avanzamento workflow |
