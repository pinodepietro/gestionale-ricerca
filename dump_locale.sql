--
-- PostgreSQL database dump
--

\restrict 0CIRS0VvCsCbUkfOn3Dy6uyHzCmrCQ0vnrtLY9pJWfPUPrmBlc3m0u20OfaEL9G

-- Dumped from database version 16.13 (Debian 16.13-1.pgdg13+1)
-- Dumped by pg_dump version 16.13 (Debian 16.13-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.work_package DROP CONSTRAINT IF EXISTS work_package_responsabile_id_fkey;
ALTER TABLE IF EXISTS ONLY public.work_package DROP CONSTRAINT IF EXISTS work_package_progetto_id_fkey;
ALTER TABLE IF EXISTS ONLY public.work_package DROP CONSTRAINT IF EXISTS work_package_partner_lead_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tipo_finanziamento DROP CONSTRAINT IF EXISTS tipo_finanziamento_template_timesheet_id_fkey;
ALTER TABLE IF EXISTS ONLY public.timesheet_testata DROP CONSTRAINT IF EXISTS timesheet_testata_template_id_fkey;
ALTER TABLE IF EXISTS ONLY public.timesheet_testata DROP CONSTRAINT IF EXISTS timesheet_testata_sal_id_fkey;
ALTER TABLE IF EXISTS ONLY public.timesheet_testata DROP CONSTRAINT IF EXISTS timesheet_testata_progetto_id_fkey;
ALTER TABLE IF EXISTS ONLY public.timesheet_testata DROP CONSTRAINT IF EXISTS timesheet_testata_persona_id_fkey;
ALTER TABLE IF EXISTS ONLY public.timesheet_riga DROP CONSTRAINT IF EXISTS timesheet_riga_wp_id_fkey;
ALTER TABLE IF EXISTS ONLY public.timesheet_riga DROP CONSTRAINT IF EXISTS timesheet_riga_testata_id_fkey;
ALTER TABLE IF EXISTS ONLY public.timesheet_riga DROP CONSTRAINT IF EXISTS timesheet_riga_task_id_fkey;
ALTER TABLE IF EXISTS ONLY public.timesheet_riga DROP CONSTRAINT IF EXISTS timesheet_riga_progetto_correlato_id_fkey;
ALTER TABLE IF EXISTS ONLY public.timesheet_cella DROP CONSTRAINT IF EXISTS timesheet_cella_riga_id_fkey;
ALTER TABLE IF EXISTS ONLY public.task DROP CONSTRAINT IF EXISTS task_wp_id_fkey;
ALTER TABLE IF EXISTS ONLY public.task DROP CONSTRAINT IF EXISTS task_responsabile_id_fkey;
ALTER TABLE IF EXISTS ONLY public.spesa DROP CONSTRAINT IF EXISTS spesa_voce_id_fkey;
ALTER TABLE IF EXISTS ONLY public.spesa DROP CONSTRAINT IF EXISTS spesa_spesa_origine_id_fkey;
ALTER TABLE IF EXISTS ONLY public.spesa DROP CONSTRAINT IF EXISTS spesa_sal_id_fkey;
ALTER TABLE IF EXISTS ONLY public.spesa DROP CONSTRAINT IF EXISTS spesa_progetto_id_fkey;
ALTER TABLE IF EXISTS ONLY public.spesa DROP CONSTRAINT IF EXISTS spesa_persona_id_fkey;
ALTER TABLE IF EXISTS ONLY public.spesa DROP CONSTRAINT IF EXISTS spesa_partner_id_fkey;
ALTER TABLE IF EXISTS ONLY public.spesa DROP CONSTRAINT IF EXISTS spesa_impegno_id_fkey;
ALTER TABLE IF EXISTS ONLY public.spesa DROP CONSTRAINT IF EXISTS spesa_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.sal DROP CONSTRAINT IF EXISTS sal_progetto_id_fkey;
ALTER TABLE IF EXISTS ONLY public.richiesta_autorizzazione_spesa DROP CONSTRAINT IF EXISTS richiesta_autorizzazione_spesa_richiedente_id_fkey;
ALTER TABLE IF EXISTS ONLY public.richiesta_autorizzazione_spesa DROP CONSTRAINT IF EXISTS richiesta_autorizzazione_spesa_progetto_id_fkey;
ALTER TABLE IF EXISTS ONLY public.richiesta_autorizzazione_spesa DROP CONSTRAINT IF EXISTS richiesta_autorizzazione_spesa_impegno_id_fkey;
ALTER TABLE IF EXISTS ONLY public.richiesta_autorizzazione_spesa DROP CONSTRAINT IF EXISTS richiesta_autorizzazione_spesa_dipartimento_id_fkey;
ALTER TABLE IF EXISTS ONLY public.richiesta_autorizzazione_spesa DROP CONSTRAINT IF EXISTS richiesta_autorizzazione_spesa_budget_voce_id_fkey;
ALTER TABLE IF EXISTS ONLY public.proposta DROP CONSTRAINT IF EXISTS proposta_responsabile_scientifico_id_fkey;
ALTER TABLE IF EXISTS ONLY public.proposta_partner DROP CONSTRAINT IF EXISTS proposta_partner_proposta_id_fkey;
ALTER TABLE IF EXISTS ONLY public.proposta DROP CONSTRAINT IF EXISTS proposta_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.progetto DROP CONSTRAINT IF EXISTS progetto_template_timesheet_id_fkey;
ALTER TABLE IF EXISTS ONLY public.progetto DROP CONSTRAINT IF EXISTS progetto_pi_id_fkey;
ALTER TABLE IF EXISTS ONLY public.progetto_partner DROP CONSTRAINT IF EXISTS progetto_partner_progetto_id_fkey;
ALTER TABLE IF EXISTS ONLY public.progetto_partner DROP CONSTRAINT IF EXISTS progetto_partner_partner_id_fkey;
ALTER TABLE IF EXISTS ONLY public.progetto DROP CONSTRAINT IF EXISTS progetto_dipartimento_id_fkey;
ALTER TABLE IF EXISTS ONLY public.progetto DROP CONSTRAINT IF EXISTS progetto_amministrativo_id_fkey;
ALTER TABLE IF EXISTS ONLY public.persona DROP CONSTRAINT IF EXISTS persona_dipartimento_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notifica DROP CONSTRAINT IF EXISTS notifica_persona_id_fkey;
ALTER TABLE IF EXISTS ONLY public.monte_ore_annuale DROP CONSTRAINT IF EXISTS monte_ore_annuale_persona_id_fkey;
ALTER TABLE IF EXISTS ONLY public.milestone DROP CONSTRAINT IF EXISTS milestone_wp_id_fkey;
ALTER TABLE IF EXISTS ONLY public.milestone DROP CONSTRAINT IF EXISTS milestone_progetto_id_fkey;
ALTER TABLE IF EXISTS ONLY public.impegno DROP CONSTRAINT IF EXISTS impegno_voce_id_fkey;
ALTER TABLE IF EXISTS ONLY public.impegno DROP CONSTRAINT IF EXISTS impegno_progetto_id_fkey;
ALTER TABLE IF EXISTS ONLY public.impegno DROP CONSTRAINT IF EXISTS impegno_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.finanziamento DROP CONSTRAINT IF EXISTS finanziamento_tipo_id_fkey;
ALTER TABLE IF EXISTS ONLY public.finanziamento DROP CONSTRAINT IF EXISTS finanziamento_progetto_id_fkey;
ALTER TABLE IF EXISTS ONLY public.erogazione DROP CONSTRAINT IF EXISTS erogazione_progetto_id_fkey;
ALTER TABLE IF EXISTS ONLY public.erogazione DROP CONSTRAINT IF EXISTS erogazione_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.documento_progetto DROP CONSTRAINT IF EXISTS documento_progetto_uploaded_by_fkey;
ALTER TABLE IF EXISTS ONLY public.documento_progetto DROP CONSTRAINT IF EXISTS documento_progetto_progetto_id_fkey;
ALTER TABLE IF EXISTS ONLY public.dipartimento DROP CONSTRAINT IF EXISTS dipartimento_direttore_id_fkey;
ALTER TABLE IF EXISTS ONLY public.deliverable DROP CONSTRAINT IF EXISTS deliverable_wp_id_fkey;
ALTER TABLE IF EXISTS ONLY public.deliverable DROP CONSTRAINT IF EXISTS deliverable_responsabile_id_fkey;
ALTER TABLE IF EXISTS ONLY public.deliverable DROP CONSTRAINT IF EXISTS deliverable_progetto_id_fkey;
ALTER TABLE IF EXISTS ONLY public.costo_orario_persona DROP CONSTRAINT IF EXISTS costo_orario_persona_persona_id_fkey;
ALTER TABLE IF EXISTS ONLY public.costo_orario_persona DROP CONSTRAINT IF EXISTS costo_orario_persona_inserito_da_fkey;
ALTER TABLE IF EXISTS ONLY public.budget_voce DROP CONSTRAINT IF EXISTS budget_voce_voce_id_fkey;
ALTER TABLE IF EXISTS ONLY public.budget_voce DROP CONSTRAINT IF EXISTS budget_voce_progetto_id_fkey;
ALTER TABLE IF EXISTS ONLY public.budget_voce DROP CONSTRAINT IF EXISTS budget_voce_partner_id_fkey;
ALTER TABLE IF EXISTS ONLY public.approvazione_timesheet DROP CONSTRAINT IF EXISTS approvazione_timesheet_testata_id_fkey;
ALTER TABLE IF EXISTS ONLY public.approvazione_timesheet DROP CONSTRAINT IF EXISTS approvazione_timesheet_approvatore_id_fkey;
ALTER TABLE IF EXISTS ONLY public.allocazione DROP CONSTRAINT IF EXISTS allocazione_progetto_id_fkey;
ALTER TABLE IF EXISTS ONLY public.allocazione DROP CONSTRAINT IF EXISTS allocazione_persona_id_fkey;
DROP INDEX IF EXISTS public.ix_progetto_codice;
DROP INDEX IF EXISTS public.ix_persona_username;
DROP INDEX IF EXISTS public.ix_persona_email;
ALTER TABLE IF EXISTS ONLY public.work_package DROP CONSTRAINT IF EXISTS work_package_pkey;
ALTER TABLE IF EXISTS ONLY public.voce_di_costo DROP CONSTRAINT IF EXISTS voce_di_costo_pkey;
ALTER TABLE IF EXISTS ONLY public.voce_di_costo DROP CONSTRAINT IF EXISTS voce_di_costo_codice_key;
ALTER TABLE IF EXISTS ONLY public.tipo_progetto DROP CONSTRAINT IF EXISTS tipo_progetto_pkey;
ALTER TABLE IF EXISTS ONLY public.tipo_progetto DROP CONSTRAINT IF EXISTS tipo_progetto_nome_key;
ALTER TABLE IF EXISTS ONLY public.tipo_finanziamento DROP CONSTRAINT IF EXISTS tipo_finanziamento_pkey;
ALTER TABLE IF EXISTS ONLY public.timesheet_testata DROP CONSTRAINT IF EXISTS timesheet_testata_pkey;
ALTER TABLE IF EXISTS ONLY public.timesheet_riga DROP CONSTRAINT IF EXISTS timesheet_riga_pkey;
ALTER TABLE IF EXISTS ONLY public.timesheet_cella DROP CONSTRAINT IF EXISTS timesheet_cella_pkey;
ALTER TABLE IF EXISTS ONLY public.template_timesheet DROP CONSTRAINT IF EXISTS template_timesheet_pkey;
ALTER TABLE IF EXISTS ONLY public.task DROP CONSTRAINT IF EXISTS task_pkey;
ALTER TABLE IF EXISTS ONLY public.spesa DROP CONSTRAINT IF EXISTS spesa_pkey;
ALTER TABLE IF EXISTS ONLY public.sal DROP CONSTRAINT IF EXISTS sal_pkey;
ALTER TABLE IF EXISTS ONLY public.richiesta_autorizzazione_spesa DROP CONSTRAINT IF EXISTS richiesta_autorizzazione_spesa_pkey;
ALTER TABLE IF EXISTS ONLY public.proposta DROP CONSTRAINT IF EXISTS proposta_pkey;
ALTER TABLE IF EXISTS ONLY public.proposta_partner DROP CONSTRAINT IF EXISTS proposta_partner_pkey;
ALTER TABLE IF EXISTS ONLY public.progetto DROP CONSTRAINT IF EXISTS progetto_pkey;
ALTER TABLE IF EXISTS ONLY public.progetto_partner DROP CONSTRAINT IF EXISTS progetto_partner_pkey;
ALTER TABLE IF EXISTS ONLY public.persona DROP CONSTRAINT IF EXISTS persona_pkey;
ALTER TABLE IF EXISTS ONLY public.partner DROP CONSTRAINT IF EXISTS partner_pkey;
ALTER TABLE IF EXISTS ONLY public.notifica DROP CONSTRAINT IF EXISTS notifica_pkey;
ALTER TABLE IF EXISTS ONLY public.monte_ore_annuale DROP CONSTRAINT IF EXISTS monte_ore_annuale_pkey;
ALTER TABLE IF EXISTS ONLY public.milestone DROP CONSTRAINT IF EXISTS milestone_pkey;
ALTER TABLE IF EXISTS ONLY public.impegno DROP CONSTRAINT IF EXISTS impegno_pkey;
ALTER TABLE IF EXISTS ONLY public.finanziamento DROP CONSTRAINT IF EXISTS finanziamento_pkey;
ALTER TABLE IF EXISTS ONLY public.erogazione DROP CONSTRAINT IF EXISTS erogazione_pkey;
ALTER TABLE IF EXISTS ONLY public.documento_progetto DROP CONSTRAINT IF EXISTS documento_progetto_pkey;
ALTER TABLE IF EXISTS ONLY public.dipartimento DROP CONSTRAINT IF EXISTS dipartimento_pkey;
ALTER TABLE IF EXISTS ONLY public.deliverable DROP CONSTRAINT IF EXISTS deliverable_pkey;
ALTER TABLE IF EXISTS ONLY public.costo_orario_persona DROP CONSTRAINT IF EXISTS costo_orario_persona_pkey;
ALTER TABLE IF EXISTS ONLY public.budget_voce DROP CONSTRAINT IF EXISTS budget_voce_pkey;
ALTER TABLE IF EXISTS ONLY public.approvazione_timesheet DROP CONSTRAINT IF EXISTS approvazione_timesheet_pkey;
ALTER TABLE IF EXISTS ONLY public.allocazione DROP CONSTRAINT IF EXISTS allocazione_pkey;
ALTER TABLE IF EXISTS ONLY public.alembic_version DROP CONSTRAINT IF EXISTS alembic_version_pkc;
DROP TABLE IF EXISTS public.work_package;
DROP TABLE IF EXISTS public.voce_di_costo;
DROP TABLE IF EXISTS public.tipo_progetto;
DROP TABLE IF EXISTS public.tipo_finanziamento;
DROP TABLE IF EXISTS public.timesheet_testata;
DROP TABLE IF EXISTS public.timesheet_riga;
DROP TABLE IF EXISTS public.timesheet_cella;
DROP TABLE IF EXISTS public.template_timesheet;
DROP TABLE IF EXISTS public.task;
DROP TABLE IF EXISTS public.spesa;
DROP TABLE IF EXISTS public.sal;
DROP TABLE IF EXISTS public.richiesta_autorizzazione_spesa;
DROP TABLE IF EXISTS public.proposta_partner;
DROP TABLE IF EXISTS public.proposta;
DROP TABLE IF EXISTS public.progetto_partner;
DROP TABLE IF EXISTS public.progetto;
DROP TABLE IF EXISTS public.persona;
DROP TABLE IF EXISTS public.partner;
DROP TABLE IF EXISTS public.notifica;
DROP TABLE IF EXISTS public.monte_ore_annuale;
DROP TABLE IF EXISTS public.milestone;
DROP TABLE IF EXISTS public.impegno;
DROP TABLE IF EXISTS public.finanziamento;
DROP TABLE IF EXISTS public.erogazione;
DROP TABLE IF EXISTS public.documento_progetto;
DROP TABLE IF EXISTS public.dipartimento;
DROP TABLE IF EXISTS public.deliverable;
DROP TABLE IF EXISTS public.costo_orario_persona;
DROP TABLE IF EXISTS public.budget_voce;
DROP TABLE IF EXISTS public.approvazione_timesheet;
DROP TABLE IF EXISTS public.allocazione;
DROP TABLE IF EXISTS public.alembic_version;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: allocazione; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allocazione (
    id uuid NOT NULL,
    persona_id uuid NOT NULL,
    progetto_id uuid NOT NULL,
    ore_assegnate numeric(8,2) NOT NULL,
    data_inizio date NOT NULL,
    data_fine date NOT NULL,
    note text,
    is_pi boolean DEFAULT false,
    is_ammin boolean DEFAULT false NOT NULL
);


--
-- Name: approvazione_timesheet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approvazione_timesheet (
    id uuid NOT NULL,
    testata_id uuid NOT NULL,
    approvatore_id uuid NOT NULL,
    ruolo_firma character varying(100) NOT NULL,
    ordine_firma integer NOT NULL,
    esito character varying(20),
    data timestamp with time zone,
    note text
);


--
-- Name: budget_voce; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_voce (
    id uuid NOT NULL,
    progetto_id uuid NOT NULL,
    voce_id uuid NOT NULL,
    partner_id uuid,
    importo_previsto numeric(14,2) NOT NULL,
    importo_rendicontato numeric(14,2) NOT NULL,
    importo_impegnato numeric(14,2) DEFAULT 0 NOT NULL
);


--
-- Name: costo_orario_persona; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.costo_orario_persona (
    id uuid NOT NULL,
    persona_id uuid NOT NULL,
    costo_orario numeric(8,2) NOT NULL,
    data_inizio date NOT NULL,
    data_fine date,
    motivazione character varying(200),
    inserito_da uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: deliverable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deliverable (
    id uuid NOT NULL,
    progetto_id uuid NOT NULL,
    wp_id uuid,
    codice character varying(20) NOT NULL,
    titolo character varying(200) NOT NULL,
    tipo character varying(50) NOT NULL,
    data_scadenza date NOT NULL,
    data_consegna date,
    stato character varying(20) NOT NULL,
    responsabile_id uuid,
    path_file character varying(500)
);


--
-- Name: dipartimento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dipartimento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(200) NOT NULL,
    direttore_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: documento_progetto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documento_progetto (
    id uuid NOT NULL,
    progetto_id uuid NOT NULL,
    tipo_documento character varying(50) NOT NULL,
    nome_file character varying(255) NOT NULL,
    path_file character varying(500) NOT NULL,
    versione character varying(20),
    descrizione text,
    uploaded_at timestamp with time zone DEFAULT now(),
    uploaded_by uuid
);


--
-- Name: erogazione; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.erogazione (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    progetto_id uuid NOT NULL,
    importo numeric(14,2) NOT NULL,
    data_erogazione date NOT NULL,
    tipo character varying(50) NOT NULL,
    documento_path character varying(500),
    descrizione text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: finanziamento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finanziamento (
    id uuid NOT NULL,
    progetto_id uuid NOT NULL,
    tipo_id uuid NOT NULL,
    importo numeric(14,2) NOT NULL,
    riferimento_contratto character varying(100),
    data_stipula date
);


--
-- Name: impegno; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.impegno (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    progetto_id uuid NOT NULL,
    voce_id uuid NOT NULL,
    data date NOT NULL,
    descrizione text NOT NULL,
    importo numeric(14,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: milestone; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestone (
    id uuid NOT NULL,
    progetto_id uuid NOT NULL,
    wp_id uuid,
    codice character varying(20) NOT NULL,
    titolo character varying(200) NOT NULL,
    data_prevista date NOT NULL,
    data_effettiva date,
    stato character varying(20) NOT NULL
);


--
-- Name: monte_ore_annuale; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monte_ore_annuale (
    id uuid NOT NULL,
    persona_id uuid NOT NULL,
    anno integer NOT NULL,
    ore_disponibili numeric(8,2) NOT NULL,
    ore_allocate numeric(8,2) NOT NULL
);


--
-- Name: notifica; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifica (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    persona_id uuid NOT NULL,
    tipo character varying(50) NOT NULL,
    titolo character varying(200) NOT NULL,
    messaggio text,
    link character varying(300),
    letta boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    urgente boolean DEFAULT false NOT NULL,
    riferimento_id character varying(100)
);


--
-- Name: partner; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner (
    id uuid NOT NULL,
    nome character varying(200) NOT NULL,
    codice_fiscale character varying(20),
    tipo character varying(30) NOT NULL,
    paese character varying(2) NOT NULL,
    referente_nome character varying(100),
    referente_email character varying(100)
);


--
-- Name: persona; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.persona (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(100) NOT NULL,
    cognome character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(200),
    codice_fiscale character varying(16),
    ruolo character varying(30) NOT NULL,
    ruolo_ente character varying(100),
    livello_contratto character varying(50),
    data_inizio_servizio date,
    attivo boolean DEFAULT true NOT NULL,
    deve_cambiare_password boolean DEFAULT false,
    username character varying(100) NOT NULL,
    ssd character varying(100),
    dipartimento_id uuid,
    CONSTRAINT persona_ruolo_check CHECK (((ruolo)::text = ANY (ARRAY['amministrativo'::text, 'ricercatore'::text, 'management'::text, 'superadmin'::text, 'monitor'::text, 'direttore_generale'::text])))
);


--
-- Name: progetto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.progetto (
    id uuid NOT NULL,
    codice character varying(50) NOT NULL,
    titolo text NOT NULL,
    acronimo character varying(30),
    descrizione text,
    tipo character varying(30) NOT NULL,
    data_inizio date NOT NULL,
    data_fine date NOT NULL,
    data_fine_rendicontazione date,
    stato character varying(20) NOT NULL,
    costo_totale numeric(14,2) NOT NULL,
    importo_finanziato numeric(14,2) NOT NULL,
    cup character varying(20),
    budget_per_partner boolean NOT NULL,
    template_timesheet_id uuid,
    note text,
    amministrativo_id uuid,
    pi_id uuid,
    riferimento_bando text,
    dipartimento_id uuid
);


--
-- Name: progetto_partner; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.progetto_partner (
    id uuid NOT NULL,
    progetto_id uuid NOT NULL,
    partner_id uuid NOT NULL,
    ruolo character varying(30) NOT NULL,
    budget_assegnato numeric(14,2)
);


--
-- Name: proposta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proposta (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    acronimo character varying(30),
    titolo text NOT NULL,
    bando text NOT NULL,
    data_scadenza_bando date NOT NULL,
    responsabile_scientifico_id uuid NOT NULL,
    descrizione character varying(500),
    data_inizio_prevista date,
    durata_mesi integer,
    costo_totale numeric(14,2),
    importo_finanziato numeric(14,2),
    importo_cofinanziato numeric(14,2),
    importo_personale_interno numeric(14,2),
    importo_overhead numeric(14,2),
    stato character varying(20) DEFAULT 'in_preparazione'::character varying NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: proposta_partner; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proposta_partner (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    proposta_id uuid NOT NULL,
    denominazione character varying(200) NOT NULL,
    tipologia character varying(100) NOT NULL,
    ruolo character varying(30) NOT NULL,
    nazionalita character varying(100),
    sito_web character varying(200)
);


--
-- Name: richiesta_autorizzazione_spesa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.richiesta_autorizzazione_spesa (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo character varying(20) NOT NULL,
    progetto_id uuid,
    dipartimento_id uuid NOT NULL,
    richiedente_id uuid NOT NULL,
    qualita_richiedente character varying(30) NOT NULL,
    tipo_contratto character varying(20) NOT NULL,
    qualita_progetto character varying(100),
    macrocategoria character varying(30) NOT NULL,
    voce_lettera character(1) NOT NULL,
    voce_altro text,
    oggetto character varying(500) NOT NULL,
    descrizione text NOT NULL,
    importo numeric(14,2) NOT NULL,
    durata_da date,
    durata_a date,
    termini_pagamento text,
    anticipazione_spesa boolean DEFAULT false NOT NULL,
    allegato_voce_g character varying(500),
    allegato_preventivo character varying(500),
    budget_voce_id uuid,
    stato character varying(30) DEFAULT 'bozza'::character varying NOT NULL,
    motivazione_rigetto text,
    impegno_id uuid,
    pdf_path character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    data_invio timestamp with time zone,
    data_approvazione_rs timestamp with time zone,
    data_approvazione_dir_dip timestamp with time zone,
    data_approvazione_dg timestamp with time zone,
    CONSTRAINT richiesta_autorizzazione_spesa_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['progetto'::character varying, 'fondi_individuali'::character varying])::text[])))
);


--
-- Name: sal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sal (
    id uuid NOT NULL,
    progetto_id uuid NOT NULL,
    numero integer NOT NULL,
    data_inizio date NOT NULL,
    data_fine date NOT NULL,
    stato character varying(20) NOT NULL,
    importo_tranche numeric(14,2),
    importo_erogato numeric(14,2),
    data_erogazione date,
    data_scadenza_rendiconto date,
    motivo_contestazione text
);


--
-- Name: spesa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spesa (
    id uuid NOT NULL,
    progetto_id uuid NOT NULL,
    voce_id uuid NOT NULL,
    persona_id uuid,
    partner_id uuid,
    sal_id uuid,
    spesa_origine_id uuid,
    importo numeric(14,2) NOT NULL,
    data date NOT NULL,
    numero_documento character varying(50),
    descrizione text,
    stato character varying(20) NOT NULL,
    allegato_path character varying(500),
    created_by uuid,
    impegno_id uuid
);


--
-- Name: task; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task (
    id uuid NOT NULL,
    wp_id uuid NOT NULL,
    codice character varying(20) NOT NULL,
    titolo character varying(200) NOT NULL,
    descrizione text,
    data_inizio date NOT NULL,
    data_fine date NOT NULL,
    stato character varying(20) NOT NULL,
    responsabile_id uuid
);


--
-- Name: template_timesheet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_timesheet (
    id uuid NOT NULL,
    nome character varying(100) NOT NULL,
    granularita character varying(20) NOT NULL,
    righe_wp_task boolean NOT NULL,
    riga_altri_progetti boolean NOT NULL,
    riga_ordinaria boolean NOT NULL,
    riga_assenze boolean NOT NULL,
    num_firmatari integer NOT NULL,
    etichetta_firmatario_1 character varying(100) NOT NULL,
    etichetta_firmatario_2 character varying(100),
    etichetta_firmatario_3 character varying(100),
    file_template_path character varying(500),
    ente_finanziatore character varying(200)
);


--
-- Name: timesheet_cella; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timesheet_cella (
    id uuid NOT NULL,
    riga_id uuid NOT NULL,
    giorno integer NOT NULL,
    ore numeric(4,2) NOT NULL,
    costo_orario_applicato numeric(8,2),
    costo_calcolato numeric(10,2)
);


--
-- Name: timesheet_riga; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timesheet_riga (
    id uuid NOT NULL,
    testata_id uuid NOT NULL,
    tipo_riga character varying(20) NOT NULL,
    wp_id uuid,
    task_id uuid,
    progetto_correlato_id uuid,
    descrizione_libera text,
    ordine integer NOT NULL
);


--
-- Name: timesheet_testata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timesheet_testata (
    id uuid NOT NULL,
    persona_id uuid NOT NULL,
    progetto_id uuid NOT NULL,
    template_id uuid NOT NULL,
    anno integer NOT NULL,
    mese integer NOT NULL,
    sal_id uuid,
    stato character varying(20) NOT NULL,
    inviato_at timestamp with time zone,
    approvato_at timestamp with time zone,
    granularita character varying(20) DEFAULT 'mensile'::character varying NOT NULL
);


--
-- Name: tipo_finanziamento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipo_finanziamento (
    id uuid NOT NULL,
    nome character varying(100) NOT NULL,
    categoria character varying(50) NOT NULL,
    ente_erogante character varying(100),
    template_timesheet_id uuid,
    note_rendicontazione character varying
);


--
-- Name: tipo_progetto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipo_progetto (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(50) NOT NULL
);


--
-- Name: voce_di_costo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voce_di_costo (
    id uuid NOT NULL,
    codice character varying(20) NOT NULL,
    descrizione character varying(200) NOT NULL,
    categoria character varying(50) NOT NULL,
    ammissibile_horizon character varying NOT NULL,
    ammissibile_pnrr character varying NOT NULL,
    ammissibile_por character varying NOT NULL
);


--
-- Name: work_package; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_package (
    id uuid NOT NULL,
    progetto_id uuid NOT NULL,
    codice character varying(20) NOT NULL,
    titolo character varying(200) NOT NULL,
    descrizione text,
    data_inizio date NOT NULL,
    data_fine date NOT NULL,
    partner_lead_id uuid,
    responsabile_id uuid,
    stato character varying(20) NOT NULL
);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
6a62fd0e4140
\.


--
-- Data for Name: allocazione; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.allocazione (id, persona_id, progetto_id, ore_assegnate, data_inizio, data_fine, note, is_pi, is_ammin) FROM stdin;
d38d5475-1ea0-4ac9-99f8-dedc6b27f3bd	da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	fe5b6c6d-eacd-41a9-a943-9d2b573fd94c	100.00	2026-07-01	2026-08-05	\N	t	f
9d287369-bc10-4890-9dbc-eaf8be1da686	2fad3a41-f5b7-4d73-b9ce-f6f58450eb7c	fe5b6c6d-eacd-41a9-a943-9d2b573fd94c	123.00	2026-07-01	2026-07-15	\N	f	f
735f29ee-601b-4268-b05e-921926797c32	2fad3a41-f5b7-4d73-b9ce-f6f58450eb7c	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	100.00	2026-03-31	2027-03-30	\N	t	f
0f1d23ed-1482-45dd-9bc8-08e167b1375f	f57baf3d-9496-46c3-a0e8-280d8ba97886	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	123.00	2026-05-11	2027-05-04	\N	f	t
b2eb8a04-6bf2-491b-9f71-9cac51e08705	da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	12.00	2026-01-01	2026-07-16	\N	f	f
\.


--
-- Data for Name: approvazione_timesheet; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.approvazione_timesheet (id, testata_id, approvatore_id, ruolo_firma, ordine_firma, esito, data, note) FROM stdin;
90ebd9ac-9fb6-40a0-8e38-b4f31d8e1983	2495019e-b989-4c48-a714-5b1fbd1d0396	2fad3a41-f5b7-4d73-b9ce-f6f58450eb7c	pi	1	approvato	2026-04-07 19:44:02.679634+00	\N
8ed85fe4-efdb-46b7-ac4e-54d7d5449ae5	c64919f6-3f02-4904-a4a8-4135c3142653	f57baf3d-9496-46c3-a0e8-280d8ba97886	amministrativo	1	approvato	2026-05-07 16:24:27.589446+00	\N
bd2c9694-79ef-4e94-ba47-03f91a093fee	8a950c4d-fb82-4a96-bf50-9a197043b813	2fad3a41-f5b7-4d73-b9ce-f6f58450eb7c	pi	1	approvato	2026-05-07 16:52:58.739282+00	\N
62761420-6a44-4ca0-943a-350ba17fbab8	9ab83d71-dc14-4393-a5b4-6703733c4525	2fad3a41-f5b7-4d73-b9ce-f6f58450eb7c	ricercatore	1	approvato	2026-06-10 12:06:15.183352+00	\N
\.


--
-- Data for Name: budget_voce; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.budget_voce (id, progetto_id, voce_id, partner_id, importo_previsto, importo_rendicontato, importo_impegnato) FROM stdin;
30ddde92-8b53-4314-867c-53cea113fd55	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	d82a7d64-9b83-445c-99d8-23abfb5babd7	\N	600000.00	216.00	0.00
dc5636ec-f2b8-4f66-b25d-11af720d9ada	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	5de4a7f8-4a21-4edd-ba2a-cc836f43f2a8	\N	300000.00	0.00	5000.00
590ed9af-74c4-4f5a-84b5-34f1f5939f22	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	3ccb1ef7-455a-44b8-a8cb-6281edd4837e	\N	100000.00	0.00	7000.00
c8c2ffd1-b360-4c92-833d-a18861532700	fe5b6c6d-eacd-41a9-a943-9d2b573fd94c	6bd58826-d6f1-4e8b-8a02-7d273f80ed64	\N	50000.00	0.00	0.00
34388a26-4fed-494c-ad94-c4f166825af2	fe5b6c6d-eacd-41a9-a943-9d2b573fd94c	5de4a7f8-4a21-4edd-ba2a-cc836f43f2a8	\N	50000.00	0.00	544.00
\.


--
-- Data for Name: costo_orario_persona; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.costo_orario_persona (id, persona_id, costo_orario, data_inizio, data_fine, motivazione, inserito_da, created_at) FROM stdin;
23a26931-09d6-466a-bfe8-f080fa214089	da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	36.00	2026-03-01	\N	\N	f57baf3d-9496-46c3-a0e8-280d8ba97886	2026-03-30 12:03:53.472969+00
c375cf5e-9c6b-4974-b786-87e31c21f5dc	2fad3a41-f5b7-4d73-b9ce-f6f58450eb7c	36.00	2026-03-31	\N	\N	f57baf3d-9496-46c3-a0e8-280d8ba97886	2026-03-31 16:23:42.275944+00
7f1c0678-9c55-4d52-ba56-7aa624e0e641	f57baf3d-9496-46c3-a0e8-280d8ba97886	45.00	2026-01-01	\N	Test	\N	2026-03-31 16:32:04.170088+00
\.


--
-- Data for Name: deliverable; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.deliverable (id, progetto_id, wp_id, codice, titolo, tipo, data_scadenza, data_consegna, stato, responsabile_id, path_file) FROM stdin;
\.


--
-- Data for Name: dipartimento; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dipartimento (id, nome, direttore_id, created_at) FROM stdin;
015d8435-66e5-43a9-a9ee-3f179edd6d4b	Scienze e Tecnologie dell'informazione	061ae02a-2074-48c4-858f-4e9806e1c2cd	2026-06-14 17:16:01.222619+00
\.


--
-- Data for Name: documento_progetto; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documento_progetto (id, progetto_id, tipo_documento, nome_file, path_file, versione, descrizione, uploaded_at, uploaded_by) FROM stdin;
baa1fa5f-64b6-4e40-b1fe-bd7f6c933b8b	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	altro	EUROPEAN HEALTH_.pdf	/app/uploads/documenti/8808eb08-f330-4ea0-b86a-ad83ce7a3e43/baa1fa5f-64b6-4e40-b1fe-bd7f6c933b8b.pdf	\N	\N	2026-03-31 18:33:15.5819+00	f57baf3d-9496-46c3-a0e8-280d8ba97886
87e670b1-be5e-4b4d-928f-7ac7d7743c9f	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	altro	Conferma.pdf	/app/uploads/documenti/8808eb08-f330-4ea0-b86a-ad83ce7a3e43/87e670b1-be5e-4b4d-928f-7ac7d7743c9f.pdf	\N	\N	2026-03-31 18:33:59.533397+00	f57baf3d-9496-46c3-a0e8-280d8ba97886
\.


--
-- Data for Name: erogazione; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.erogazione (id, progetto_id, importo, data_erogazione, tipo, documento_path, descrizione, created_by, created_at) FROM stdin;
d484d922-39a0-4104-b4c6-a745745308b7	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	330000.00	2025-12-15	pagamento_fattura	\N	SAL 1	f57baf3d-9496-46c3-a0e8-280d8ba97886	2026-06-10 10:58:00.788231+00
ffeba75c-b7fe-4491-9111-1ef10de2674e	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	83094.00	2026-04-15	pagamento_fattura	\N	SAL 2	f57baf3d-9496-46c3-a0e8-280d8ba97886	2026-06-10 10:59:10.565363+00
\.


--
-- Data for Name: finanziamento; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.finanziamento (id, progetto_id, tipo_id, importo, riferimento_contratto, data_stipula) FROM stdin;
\.


--
-- Data for Name: impegno; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.impegno (id, progetto_id, voce_id, data, descrizione, importo, created_at, created_by) FROM stdin;
8ff1717e-99af-4d67-912a-120e68a83540	fe5b6c6d-eacd-41a9-a943-9d2b573fd94c	5de4a7f8-4a21-4edd-ba2a-cc836f43f2a8	2026-05-11	Missione Londra De Pietro	544.00	2026-05-10 09:35:34.530686	f57baf3d-9496-46c3-a0e8-280d8ba97886
e8a9b9b9-55a2-4a28-9a95-7208b667a504	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	3ccb1ef7-455a-44b8-a8cb-6281edd4837e	2026-05-11	Missione: Missione PARIGI	1200.00	2026-05-11 09:13:00.825599	\N
663b32c1-ae77-4525-9976-8940ffc32fd0	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	3ccb1ef7-455a-44b8-a8cb-6281edd4837e	2026-05-11	Missione: MISSIONE PROVA 2	1600.00	2026-05-11 10:00:02.308787	\N
c685e6f6-ed03-4ab2-b1bf-880661f6cde4	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	3ccb1ef7-455a-44b8-a8cb-6281edd4837e	2026-05-11	Missione: MISSIONE PROVA 3	2000.00	2026-05-11 10:08:13.013065	\N
5a045dd5-8109-48fb-a2ac-886adc5be49d	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	3ccb1ef7-455a-44b8-a8cb-6281edd4837e	2026-05-11	Missione: MISSIONE PROVA 5	3000.00	2026-05-11 10:44:52.426332	\N
31750be6-ab46-4103-afcc-8e4f0c2e393e	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	5de4a7f8-4a21-4edd-ba2a-cc836f43f2a8	2026-06-14	Autorizzazione spesa — PC MAC	2000.00	2026-06-14 19:57:35.655256	061ae02a-2074-48c4-858f-4e9806e1c2cd
196887ca-0d72-4f4c-9f1f-3be794975221	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	5de4a7f8-4a21-4edd-ba2a-cc836f43f2a8	2026-06-14	Autorizzazione spesa — PC MAC	3000.00	2026-06-14 20:29:43.313302	b978fa0e-3196-4465-b834-7199909b0c92
b08ea93a-84a0-4b36-8db8-54124b4fb70f	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	3ccb1ef7-455a-44b8-a8cb-6281edd4837e	2026-06-14	Autorizzazione spesa — acrobat	4000.00	2026-06-14 21:19:26.107196	b978fa0e-3196-4465-b834-7199909b0c92
c4ce52e5-5059-43ef-8cd6-66e8605d9264	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	3ccb1ef7-455a-44b8-a8cb-6281edd4837e	2026-06-15	Autorizzazione spesa — PC MAC	1000.00	2026-06-15 07:40:38.717636	b978fa0e-3196-4465-b834-7199909b0c92
\.


--
-- Data for Name: milestone; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.milestone (id, progetto_id, wp_id, codice, titolo, data_prevista, data_effettiva, stato) FROM stdin;
\.


--
-- Data for Name: monte_ore_annuale; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.monte_ore_annuale (id, persona_id, anno, ore_disponibili, ore_allocate) FROM stdin;
fa7f1bbd-2683-49ef-8f7d-c8c2340f48e4	2fad3a41-f5b7-4d73-b9ce-f6f58450eb7c	2026	1000.00	223.00
e461ecf6-2df0-4f94-b7ab-1c034b56a19d	da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	2026	300.00	292.00
\.


--
-- Data for Name: notifica; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifica (id, persona_id, tipo, titolo, messaggio, link, letta, created_at, urgente, riferimento_id) FROM stdin;
15696f11-4118-43fb-a894-d2cee840e6fa	f57baf3d-9496-46c3-a0e8-280d8ba97886	progetto_assegnato	Nuovo progetto assegnato	Ti e stato assegnato il progetto 'PPP' (PPP). Completa la configurazione.	/configurazione/44f7b236-65fa-4712-ae51-e22022d4d459	t	2026-04-02 21:17:53.08654+00	f	\N
87138084-a597-4cf0-9ca1-2f2a124125cc	f57baf3d-9496-46c3-a0e8-280d8ba97886	progetto_assegnato	Nuovo progetto assegnato	Il superamministratore ti ha assegnato il progetto 'Neurosymbolic AI' (codice: PRIN 2026). Accedi alla sezione Configurazione per completarlo.	/configurazione/fe5b6c6d-eacd-41a9-a943-9d2b573fd94c	t	2026-05-07 14:54:45.267714+00	f	\N
f6fd742a-4354-4614-adcf-69047a489a55	f57baf3d-9496-46c3-a0e8-280d8ba97886	autorizzazione_spesa	Nuova richiesta di autorizzazione spesa	Administrator ha inviato una richiesta di autorizzazione spesa per 'PC portatile test' — importo 1,200.00 €. In attesa della tua approvazione come Responsabile Amministrativo.	/autorizzazioni/192eac52-1a20-4c88-bfec-b99bf7bdb064	t	2026-06-14 17:25:35.416618+00	f	192eac52-1a20-4c88-bfec-b99bf7bdb064
517ace1e-ace6-497e-a067-39c20efcfe33	f57baf3d-9496-46c3-a0e8-280d8ba97886	autorizzazione_spesa	Nuova richiesta di autorizzazione spesa	Bianchi ha inviato una richiesta di autorizzazione spesa per 'PC MAC' — importo 2,000.00 €. In attesa della tua approvazione come Responsabile Amministrativo.	/autorizzazioni/4336fd55-e023-4cb1-a3b4-64d6295de77d	t	2026-06-14 19:51:00.600422+00	f	4336fd55-e023-4cb1-a3b4-64d6295de77d
7121b2f5-b0bc-4a4e-8231-6ec7714f44c2	2fad3a41-f5b7-4d73-b9ce-f6f58450eb7c	autorizzazione_spesa	Richiesta autorizzazione spesa — tua approvazione richiesta	La richiesta 'PC MAC' (2,000.00 €) è stata approvata dall'Amministrativo e attende la tua approvazione come Responsabile Scientifico.	/autorizzazioni/4336fd55-e023-4cb1-a3b4-64d6295de77d	t	2026-06-14 19:54:12.27745+00	f	4336fd55-e023-4cb1-a3b4-64d6295de77d
116f49c1-7b04-4bb7-a5d7-15e2d11d2dd5	2fad3a41-f5b7-4d73-b9ce-f6f58450eb7c	timesheet_pendente	Nuovo timesheet da approvare	Laura Bianchi ha inviato il timesheet di Gennaio 2026	/timesheet/9ab83d71-dc14-4393-a5b4-6703733c4525	t	2026-06-10 12:05:52.817665+00	f	9ab83d71-dc14-4393-a5b4-6703733c4525
4c7ed4b8-7f47-409b-9845-297ed257f041	061ae02a-2074-48c4-858f-4e9806e1c2cd	autorizzazione_spesa	Richiesta autorizzazione spesa — tua approvazione richiesta	La richiesta 'PC MAC' (2,000.00 €) è stata approvata dal Responsabile Scientifico e attende la tua approvazione come Direttore di Dipartimento.	/autorizzazioni/4336fd55-e023-4cb1-a3b4-64d6295de77d	t	2026-06-14 19:56:14.036409+00	f	4336fd55-e023-4cb1-a3b4-64d6295de77d
f016bfb9-4e4b-4e76-94ae-a1e29a5d1951	f57baf3d-9496-46c3-a0e8-280d8ba97886	autorizzazione_spesa	Nuova richiesta di autorizzazione spesa	Bianchi ha inviato una richiesta di autorizzazione spesa per 'PC MAC' — importo 2,000.00 €. In attesa della tua approvazione come Responsabile Amministrativo.	/autorizzazioni/4336fd55-e023-4cb1-a3b4-64d6295de77d	t	2026-06-14 19:53:35.467029+00	f	4336fd55-e023-4cb1-a3b4-64d6295de77d
1572809b-1be4-4092-ac9a-fc7dfe7d4760	f57baf3d-9496-46c3-a0e8-280d8ba97886	autorizzazione_spesa	Nuova richiesta di autorizzazione spesa	Bianchi ha inviato una richiesta di autorizzazione spesa per 'PC MAC' — importo 3,000.00 €. In attesa della tua approvazione come Responsabile Amministrativo.	/autorizzazioni/8dc78a35-3b9f-495e-a465-1cbcfb37bcb0	t	2026-06-14 20:15:17.123289+00	f	8dc78a35-3b9f-495e-a465-1cbcfb37bcb0
36d2c86b-f6bd-46ff-a9fb-1a1f0f98f798	2fad3a41-f5b7-4d73-b9ce-f6f58450eb7c	autorizzazione_spesa	Richiesta autorizzazione spesa — tua approvazione richiesta	La richiesta 'PC MAC' (3,000.00 €) è stata approvata dall'Amministrativo e attende la tua approvazione come Responsabile Scientifico.	/autorizzazioni/8dc78a35-3b9f-495e-a465-1cbcfb37bcb0	t	2026-06-14 20:16:05.546078+00	f	8dc78a35-3b9f-495e-a465-1cbcfb37bcb0
3b67a7f6-e484-48ca-bd85-62bb56c6998e	061ae02a-2074-48c4-858f-4e9806e1c2cd	autorizzazione_spesa	Richiesta autorizzazione spesa — tua approvazione richiesta	La richiesta 'PC MAC' (3,000.00 €) è stata approvata dal Responsabile Scientifico e attende la tua approvazione come Direttore di Dipartimento.	/autorizzazioni/8dc78a35-3b9f-495e-a465-1cbcfb37bcb0	t	2026-06-14 20:16:42.397109+00	f	8dc78a35-3b9f-495e-a465-1cbcfb37bcb0
b1e9658e-d8a9-4dac-8a15-0a2533ed5030	f57baf3d-9496-46c3-a0e8-280d8ba97886	autorizzazione_spesa	Nuova richiesta di autorizzazione spesa	Bianchi ha inviato una richiesta di autorizzazione spesa per 'acrobat' — importo 4,000.00 €. In attesa della tua approvazione come Responsabile Amministrativo.	/autorizzazioni/5359977d-9b3d-4146-a190-ec2c54096827	t	2026-06-14 21:11:51.820719+00	f	5359977d-9b3d-4146-a190-ec2c54096827
d95eb486-80af-4246-8cc9-4e8bedd03e00	2fad3a41-f5b7-4d73-b9ce-f6f58450eb7c	autorizzazione_spesa	Richiesta autorizzazione spesa — tua approvazione richiesta	La richiesta 'acrobat' (4,000.00 €) è stata approvata dall'Amministrativo e attende la tua approvazione come Responsabile Scientifico.	/autorizzazioni/5359977d-9b3d-4146-a190-ec2c54096827	t	2026-06-14 21:12:17.214409+00	f	5359977d-9b3d-4146-a190-ec2c54096827
436950f6-a42b-4de5-8564-5ca0b1331443	061ae02a-2074-48c4-858f-4e9806e1c2cd	autorizzazione_spesa	Richiesta autorizzazione spesa — tua approvazione richiesta	La richiesta 'acrobat' (4,000.00 €) è stata approvata dal Responsabile Scientifico e attende la tua approvazione come Direttore di Dipartimento.	/autorizzazioni/5359977d-9b3d-4146-a190-ec2c54096827	t	2026-06-14 21:13:19.771005+00	f	5359977d-9b3d-4146-a190-ec2c54096827
680e24f9-414d-457c-b60d-eae1771c88ac	da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	timesheet_approvato	Timesheet approvato — Gennaio 2026	Il tuo timesheet di Gennaio 2026 è stato approvato.	/timesheet/9ab83d71-dc14-4393-a5b4-6703733c4525	t	2026-06-10 12:06:15.171077+00	f	9ab83d71-dc14-4393-a5b4-6703733c4525
ef7a7469-97c7-4141-89eb-71620e162e70	da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	autorizzazione_spesa	Richiesta autorizzazione spesa APPROVATA	La tua richiesta 'PC MAC' (2,000.00 €) è stata approvata definitivamente dal Direttore Generale. Il PDF è disponibile nella sezione Autorizzazioni.	/autorizzazioni/4336fd55-e023-4cb1-a3b4-64d6295de77d	t	2026-06-14 19:57:35.650518+00	f	4336fd55-e023-4cb1-a3b4-64d6295de77d
47a6bb83-3a53-4884-90f7-db8d1bf627f6	b978fa0e-3196-4465-b834-7199909b0c92	autorizzazione_spesa	Richiesta autorizzazione spesa — tua approvazione richiesta	La richiesta 'acrobat' (4,000.00 €) è stata approvata dal Direttore di Dipartimento e attende la tua approvazione definitiva come Direttore Generale.	/autorizzazioni/5359977d-9b3d-4146-a190-ec2c54096827	t	2026-06-14 21:13:34.172315+00	f	5359977d-9b3d-4146-a190-ec2c54096827
f2db48a9-bc5c-4b26-9bd0-c2dcc7d99bf2	f57baf3d-9496-46c3-a0e8-280d8ba97886	autorizzazione_spesa	Nuova richiesta di autorizzazione spesa	Bianchi ha inviato una richiesta di autorizzazione spesa per 'PC MAC' — importo 1,000.00 €. In attesa della tua approvazione come Responsabile Amministrativo.	/autorizzazioni/eb1361cd-eb6d-4c0c-b55e-ede3d1fe3c36	t	2026-06-14 21:44:17.238086+00	f	eb1361cd-eb6d-4c0c-b55e-ede3d1fe3c36
11ef8c1e-2ea2-4664-82a0-b4e28dbf644f	2fad3a41-f5b7-4d73-b9ce-f6f58450eb7c	autorizzazione_spesa	Richiesta autorizzazione spesa — tua approvazione richiesta	La richiesta 'PC MAC' (1,000.00 €) è stata approvata dall'Amministrativo e attende la tua approvazione come Responsabile Scientifico.	/autorizzazioni/eb1361cd-eb6d-4c0c-b55e-ede3d1fe3c36	t	2026-06-14 21:44:50.114601+00	f	eb1361cd-eb6d-4c0c-b55e-ede3d1fe3c36
a93ec00c-fb9f-46bd-973a-52fe7166670a	da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	autorizzazione_spesa	Richiesta autorizzazione spesa RIGETTATA	La tua richiesta 'PC MAC' (2,000.00 €) è stata rigettata. Motivazione: nvnbvb. Puoi riaprirla, correggerla e reinviarla.	/autorizzazioni/4336fd55-e023-4cb1-a3b4-64d6295de77d	t	2026-06-14 19:52:53.735567+00	f	4336fd55-e023-4cb1-a3b4-64d6295de77d
6a64f586-f1d0-4368-b93c-a2b74bab6887	da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	autorizzazione_spesa	Richiesta autorizzazione spesa APPROVATA	La tua richiesta 'PC MAC' (3,000.00 €) è stata approvata definitivamente dal Direttore Generale. Il PDF è disponibile nella sezione Autorizzazioni.	/autorizzazioni/8dc78a35-3b9f-495e-a465-1cbcfb37bcb0	t	2026-06-14 20:29:43.309142+00	f	8dc78a35-3b9f-495e-a465-1cbcfb37bcb0
8bf87c40-e299-4858-8256-1b4f3becdc06	da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	autorizzazione_spesa	Richiesta autorizzazione spesa APPROVATA	La tua richiesta 'acrobat' (4,000.00 €) è stata approvata definitivamente dal Direttore Generale. Il PDF è disponibile nella sezione Autorizzazioni.	/autorizzazioni/5359977d-9b3d-4146-a190-ec2c54096827	t	2026-06-14 21:19:26.10355+00	f	5359977d-9b3d-4146-a190-ec2c54096827
f67a059c-0920-47e6-8a86-e91f8215880b	da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	autorizzazione_spesa	Richiesta autorizzazione spesa RIGETTATA	La tua richiesta 'PC MAC' (1,000.00 €) è stata rigettata. Motivazione: capitolo budget sbagliato. Puoi riaprirla, correggerla e reinviarla.	/autorizzazioni/eb1361cd-eb6d-4c0c-b55e-ede3d1fe3c36	t	2026-06-14 21:47:32.782102+00	f	eb1361cd-eb6d-4c0c-b55e-ede3d1fe3c36
ddbd4cd3-fe15-47ea-8e55-2bd60ade623a	f57baf3d-9496-46c3-a0e8-280d8ba97886	autorizzazione_spesa	Nuova richiesta di autorizzazione spesa	Bianchi ha inviato una richiesta di autorizzazione spesa per 'PC MAC' — importo 1,000.00 €. In attesa della tua approvazione come Responsabile Amministrativo.	/autorizzazioni/98ad490b-fa24-4131-8e9d-605fb5b4eb85	t	2026-06-15 07:38:32.922431+00	f	98ad490b-fa24-4131-8e9d-605fb5b4eb85
473895a4-9abe-475f-8646-b1af8f60d633	2fad3a41-f5b7-4d73-b9ce-f6f58450eb7c	autorizzazione_spesa	Richiesta autorizzazione spesa — tua approvazione richiesta	La richiesta 'PC MAC' (1,000.00 €) è stata approvata dall'Amministrativo e attende la tua approvazione come Responsabile Scientifico.	/autorizzazioni/98ad490b-fa24-4131-8e9d-605fb5b4eb85	t	2026-06-15 07:39:30.264977+00	f	98ad490b-fa24-4131-8e9d-605fb5b4eb85
e21cd59c-6c95-4b96-8c82-806496c950ac	061ae02a-2074-48c4-858f-4e9806e1c2cd	autorizzazione_spesa	Richiesta autorizzazione spesa — tua approvazione richiesta	La richiesta 'PC MAC' (1,000.00 €) è stata approvata dal Responsabile Scientifico e attende la tua approvazione come Direttore di Dipartimento.	/autorizzazioni/98ad490b-fa24-4131-8e9d-605fb5b4eb85	t	2026-06-15 07:39:45.567494+00	f	98ad490b-fa24-4131-8e9d-605fb5b4eb85
2098e4dd-1cf7-4aee-a857-d5b735252547	b978fa0e-3196-4465-b834-7199909b0c92	autorizzazione_spesa	Richiesta autorizzazione spesa — tua approvazione richiesta	La richiesta 'PC MAC' (1,000.00 €) è stata approvata dal Direttore di Dipartimento e attende la tua approvazione definitiva come Direttore Generale.	/autorizzazioni/98ad490b-fa24-4131-8e9d-605fb5b4eb85	t	2026-06-15 07:40:09.794911+00	f	98ad490b-fa24-4131-8e9d-605fb5b4eb85
a0077173-57a6-4455-a625-0e00ef2e242b	da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	autorizzazione_spesa	Richiesta autorizzazione spesa APPROVATA	La tua richiesta 'PC MAC' (1,000.00 €) è stata approvata definitivamente dal Direttore Generale. Il PDF è disponibile nella sezione Autorizzazioni.	/autorizzazioni/98ad490b-fa24-4131-8e9d-605fb5b4eb85	t	2026-06-15 07:40:38.711908+00	f	98ad490b-fa24-4131-8e9d-605fb5b4eb85
\.


--
-- Data for Name: partner; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.partner (id, nome, codice_fiscale, tipo, paese, referente_nome, referente_email) FROM stdin;
4e75631c-c3e1-4c94-b1cc-32754e862d8f	Università Pegaso	\N	università	IT	giuseppe de pietro	\N
\.


--
-- Data for Name: persona; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.persona (id, nome, cognome, email, password_hash, codice_fiscale, ruolo, ruolo_ente, livello_contratto, data_inizio_servizio, attivo, deve_cambiare_password, username, ssd, dipartimento_id) FROM stdin;
f57baf3d-9496-46c3-a0e8-280d8ba97886	Marzia	Pirone	admin@ateneo.it	$2b$12$Uh1ebkleVxap1qRR76XdwuBF/lCzdCx5F..FMGs1pMSPjIQPFlv62	\N	amministrativo	\N	\N	\N	t	f	marzia.pirone	\N	\N
2fad3a41-f5b7-4d73-b9ce-f6f58450eb7c	Mario	Rossi	pi@ateneo.it	$2b$12$ScargEIz7kSjFciZXzn.zuiAdgrG3qTt9BBrcMd9ge98ZaSqGk69K	\N	ricercatore	\N	\N	\N	t	f	mario.rossi	\N	015d8435-66e5-43a9-a9ee-3f179edd6d4b
b978fa0e-3196-4465-b834-7199909b0c92	Andrea	Proietti	direzione.genrale@unipegaso.it	$2b$12$NmQrP224Pljv1u0cgBHjnOlCHjkpSZjPFbGNDXCnnGRl/uGiFo4Di	\N	direttore_generale	\N	\N	2025-07-01	t	f	andrea.proietti	\N	\N
da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	Laura	Bianchi	bianchi@ateneo.it	$2b$12$VtgZsrwsBMbiM428DowoLOxcjHC/DKC2DHcAHmkj8eyi3GJcuo4B.	\N	ricercatore	Professore Associato	tempo pieno	\N	t	f	laura.bianchi	INFO-01/A	015d8435-66e5-43a9-a9ee-3f179edd6d4b
028c6c85-6c51-4c86-a466-bb2443e82152	monitor	monitor1	monitor@ateneo.it	$2b$12$rHvCZ/dzuu78ukzLFb9/jeCPZXa8U7lBjbCfFV4nf1MGge9qbia9S	\N	monitor	Amministrativo	\N	\N	t	f	monitor.monitor1	\N	\N
061ae02a-2074-48c4-858f-4e9806e1c2cd	System	Administrator	superadmin@ateneo.it	$2b$12$XJYXaukQWUCLhBh6GVbGK.DfG8Qhlwf0Nz/Q6DqyN/0JE2yuEFLM.	\N	superadmin	Amministrativo	\N	\N	t	f	admin	\N	\N
\.


--
-- Data for Name: progetto; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.progetto (id, codice, titolo, acronimo, descrizione, tipo, data_inizio, data_fine, data_fine_rendicontazione, stato, costo_totale, importo_finanziato, cup, budget_per_partner, template_timesheet_id, note, amministrativo_id, pi_id, riferimento_bando, dipartimento_id) FROM stdin;
fe5b6c6d-eacd-41a9-a943-9d2b573fd94c	PRIN 2026	Neurosymbolic AI	\N	Neurosimbolico AI	MUR/PRIN	2026-06-01	2028-12-31	\N	attivo	100000.00	100000.00	\N	f	\N	\N	f57baf3d-9496-46c3-a0e8-280d8ba97886	\N	\N	\N
8808eb08-f330-4ea0-b86a-ad83ce7a3e43	001	WASTEWATER	WASTE	The project adopts a tailored approach to implement activities and deliver targeted outcomes that effectively respond to the needs of the European Commission, while supporting HERA’s mission	Horizon Europe	2025-06-15	2029-05-31	2029-10-31	attivo	1300000.00	1250000.00	123	f	\N	\N	f57baf3d-9496-46c3-a0e8-280d8ba97886	\N	\N	015d8435-66e5-43a9-a9ee-3f179edd6d4b
\.


--
-- Data for Name: progetto_partner; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.progetto_partner (id, progetto_id, partner_id, ruolo, budget_assegnato) FROM stdin;
6cfb09e7-4a82-4c60-b132-9b6eab308cc5	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	4e75631c-c3e1-4c94-b1cc-32754e862d8f	partner	\N
51386e42-6947-4970-b439-a6fa24a7c6af	fe5b6c6d-eacd-41a9-a943-9d2b573fd94c	4e75631c-c3e1-4c94-b1cc-32754e862d8f	capofila	\N
\.


--
-- Data for Name: proposta; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.proposta (id, acronimo, titolo, bando, data_scadenza_bando, responsabile_scientifico_id, descrizione, data_inizio_prevista, durata_mesi, costo_totale, importo_finanziato, importo_cofinanziato, importo_personale_interno, importo_overhead, stato, created_by, created_at, updated_at) FROM stdin;
d7ff0f0c-8868-44e2-a18b-826b19913516	\N	PROVA XX	PRIN 2026	2026-06-09	da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	adsds	\N	\N	1000.00	890.00	110.00	\N	123.00	in_preparazione	da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	2026-06-09 10:41:07.644502+00	2026-06-09 10:41:07.644502+00
\.


--
-- Data for Name: proposta_partner; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.proposta_partner (id, proposta_id, denominazione, tipologia, ruolo, nazionalita, sito_web) FROM stdin;
8e74c3eb-bc46-4d5f-ae79-ab00e0ce4468	d7ff0f0c-8868-44e2-a18b-826b19913516	Università Pegaso	Università	partner	Italiana	www.unipegaso.it
\.


--
-- Data for Name: richiesta_autorizzazione_spesa; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.richiesta_autorizzazione_spesa (id, tipo, progetto_id, dipartimento_id, richiedente_id, qualita_richiedente, tipo_contratto, qualita_progetto, macrocategoria, voce_lettera, voce_altro, oggetto, descrizione, importo, durata_da, durata_a, termini_pagamento, anticipazione_spesa, allegato_voce_g, allegato_preventivo, budget_voce_id, stato, motivazione_rigetto, impegno_id, pdf_path, created_at, updated_at, data_invio, data_approvazione_rs, data_approvazione_dir_dip, data_approvazione_dg) FROM stdin;
192eac52-1a20-4c88-bfec-b99bf7bdb064	progetto	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	015d8435-66e5-43a9-a9ee-3f179edd6d4b	061ae02a-2074-48c4-858f-4e9806e1c2cd	ricercatore	pieno	\N	strumentazioni	q	\N	PC portatile test	Acquisto PC per attività di ricerca	1200.00	\N	\N	\N	f	\N	\N	\N	attesa_ammin	\N	\N	\N	2026-06-14 17:25:33.850549+00	2026-06-14 17:25:35.416618+00	\N	\N	\N	\N
eb1361cd-eb6d-4c0c-b55e-ede3d1fe3c36	progetto	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	015d8435-66e5-43a9-a9ee-3f179edd6d4b	da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	professore_ordinario	pieno	Componente del Gruppo di Ricerca	strumentazioni	q	\N	PC MAC	pv	1000.00	\N	\N	\N	f	\N	\N	dc5636ec-f2b8-4f66-b25d-11af720d9ada	rigettata	capitolo budget sbagliato	\N	\N	2026-06-14 21:44:15.595633+00	2026-06-14 21:47:32.782102+00	2026-06-14 21:44:17.240884+00	\N	\N	\N
4336fd55-e023-4cb1-a3b4-64d6295de77d	progetto	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	015d8435-66e5-43a9-a9ee-3f179edd6d4b	da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	ricercatore	definito	Componente del Gruppo di Ricerca	strumentazioni	q	\N	PC MAC	Macbook	2000.00	\N	\N	\N	f	\N	\N	dc5636ec-f2b8-4f66-b25d-11af720d9ada	approvata	\N	31750be6-ab46-4103-afcc-8e4f0c2e393e	/app/uploads/autorizzazioni/4336fd55-e023-4cb1-a3b4-64d6295de77d/AutorizzazioneSpesa_4336fd55.pdf	2026-06-14 19:49:06.084728+00	2026-06-14 19:57:35.650518+00	\N	\N	\N	\N
98ad490b-fa24-4131-8e9d-605fb5b4eb85	progetto	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	015d8435-66e5-43a9-a9ee-3f179edd6d4b	da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	professore_ordinario	pieno	Componente del Gruppo di Ricerca	strumentazioni	q	\N	PC MAC	<sdf	1000.00	\N	\N	\N	f	\N	\N	590ed9af-74c4-4f5a-84b5-34f1f5939f22	approvata	\N	c4ce52e5-5059-43ef-8cd6-66e8605d9264	/app/uploads/autorizzazioni/98ad490b-fa24-4131-8e9d-605fb5b4eb85/AutorizzazioneSpesa_98ad490b.pdf	2026-06-14 21:58:52.3453+00	2026-06-15 07:40:38.711908+00	2026-06-15 07:38:32.924691+00	2026-06-15 07:39:45.572122+00	2026-06-15 07:40:09.797192+00	2026-06-15 07:40:38.719007+00
8dc78a35-3b9f-495e-a465-1cbcfb37bcb0	progetto	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	015d8435-66e5-43a9-a9ee-3f179edd6d4b	da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	ricercatore	definito	Componente del Gruppo di Ricerca	strumentazioni	q	\N	PC MAC	mac	3000.00	\N	\N	\N	f	\N	\N	dc5636ec-f2b8-4f66-b25d-11af720d9ada	approvata	\N	196887ca-0d72-4f4c-9f1f-3be794975221	/app/uploads/autorizzazioni/8dc78a35-3b9f-495e-a465-1cbcfb37bcb0/AutorizzazioneSpesa_8dc78a35.pdf	2026-06-14 20:15:09.542122+00	2026-06-14 20:29:43.309142+00	\N	\N	\N	\N
5359977d-9b3d-4146-a190-ec2c54096827	progetto	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	015d8435-66e5-43a9-a9ee-3f179edd6d4b	da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	ricercatore	definito	Componente del Gruppo di Ricerca	strumentazioni	r	\N	acrobat	acrobat	4000.00	\N	\N	\N	f	\N	/app/uploads/autorizzazioni/5359977d-9b3d-4146-a190-ec2c54096827/preventivo.pdf	590ed9af-74c4-4f5a-84b5-34f1f5939f22	approvata	\N	b08ea93a-84a0-4b36-8db8-54124b4fb70f	/app/uploads/autorizzazioni/5359977d-9b3d-4146-a190-ec2c54096827/AutorizzazioneSpesa_5359977d.pdf	2026-06-14 21:11:49.244222+00	2026-06-14 21:26:56.433793+00	2026-06-14 21:11:51.820719+00	2026-06-14 21:13:19.771005+00	2026-06-14 21:13:34.172315+00	2026-06-14 21:19:26.10355+00
\.


--
-- Data for Name: sal; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sal (id, progetto_id, numero, data_inizio, data_fine, stato, importo_tranche, importo_erogato, data_erogazione, data_scadenza_rendiconto, motivo_contestazione) FROM stdin;
fd081352-6ea4-4952-9323-0364d46653ab	fe5b6c6d-eacd-41a9-a943-9d2b573fd94c	1	2026-06-01	2026-08-19	aperto	1234.00	\N	\N	2026-07-30	\N
2557b252-08d4-4ce8-96a0-5ddf934bf31d	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	1	2026-03-31	2026-06-30	rendicontato	\N	\N	\N	\N	\N
79035fd7-1f51-4ef9-a515-348d2bdb2382	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	2	2026-01-01	2026-02-02	rendicontato	\N	\N	\N	\N	\N
\.


--
-- Data for Name: spesa; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.spesa (id, progetto_id, voce_id, persona_id, partner_id, sal_id, spesa_origine_id, importo, data, numero_documento, descrizione, stato, allegato_path, created_by, impegno_id) FROM stdin;
25bbe5bd-cd97-47c5-acac-42d496c7e106	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	5de4a7f8-4a21-4edd-ba2a-cc836f43f2a8	\N	\N	\N	\N	50000.00	2026-04-02	FT 1223	Fattura	registrata	\N	\N	\N
03cc5676-6a9e-40bf-90c1-e077352bf4d1	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	3ccb1ef7-455a-44b8-a8cb-6281edd4837e	\N	\N	\N	\N	100.00	2026-04-15	Fattura 234	\N	registrata	\N	\N	\N
a3a2c732-760a-4c84-b8e3-1b666ef1dba7	fe5b6c6d-eacd-41a9-a943-9d2b573fd94c	5de4a7f8-4a21-4edd-ba2a-cc836f43f2a8	\N	\N	fd081352-6ea4-4952-9323-0364d46653ab	\N	3456.00	2026-06-17	2	fattura	registrata	\N	\N	\N
876926e5-bc34-408e-b3c8-d52ca1767f23	fe5b6c6d-eacd-41a9-a943-9d2b573fd94c	5de4a7f8-4a21-4edd-ba2a-cc836f43f2a8	\N	\N	\N	\N	6000.00	2026-05-12	Fattura 234	pagamento missione	registrata	\N	\N	8ff1717e-99af-4d67-912a-120e68a83540
053cc9d5-902d-448c-a414-85768c847fc5	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	3ccb1ef7-455a-44b8-a8cb-6281edd4837e	\N	\N	\N	\N	200.00	2026-05-11	\N	Rimborso missione #88 - MISSIONE PROVA 4	registrata	\N	\N	\N
4ce597a9-48aa-40e6-9f55-5ed33584f0dd	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	3ccb1ef7-455a-44b8-a8cb-6281edd4837e	\N	\N	\N	\N	1200.00	2026-06-10	\N	\N	registrata	\N	\N	e8a9b9b9-55a2-4a28-9a95-7208b667a504
a387deb8-ffd8-415f-b1ae-8760969ad1d8	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	3ccb1ef7-455a-44b8-a8cb-6281edd4837e	\N	\N	\N	\N	1750.00	2026-06-10	\N	missione prova	registrata	\N	\N	5a045dd5-8109-48fb-a2ac-886adc5be49d
8e9efa2c-a063-4c15-ac7f-f42ea0fa39c3	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	3ccb1ef7-455a-44b8-a8cb-6281edd4837e	\N	\N	\N	\N	1600.00	2026-06-10	\N	missione prpva 2	registrata	\N	\N	663b32c1-ae77-4525-9976-8940ffc32fd0
3a825801-041a-45f7-bbeb-ca07e0893a52	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	d82a7d64-9b83-445c-99d8-23abfb5babd7	\N	\N	2557b252-08d4-4ce8-96a0-5ddf934bf31d	\N	216.00	2026-06-30	\N	Personale dipendente — SAL #1 (ricalcolo)	registrata	\N	\N	\N
9ef757a3-92ec-428d-b9b8-34497b99cc40	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	d82a7d64-9b83-445c-99d8-23abfb5babd7	\N	\N	79035fd7-1f51-4ef9-a515-348d2bdb2382	\N	216.00	2026-02-02	\N	Personale dipendente — SAL #2	registrata	\N	\N	\N
\.


--
-- Data for Name: task; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.task (id, wp_id, codice, titolo, descrizione, data_inizio, data_fine, stato, responsabile_id) FROM stdin;
\.


--
-- Data for Name: template_timesheet; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.template_timesheet (id, nome, granularita, righe_wp_task, riga_altri_progetti, riga_ordinaria, riga_assenze, num_firmatari, etichetta_firmatario_1, etichetta_firmatario_2, etichetta_firmatario_3, file_template_path, ente_finanziatore) FROM stdin;
6bcd8646-ca02-48a0-bf61-32103ad9cf88	Standard interno (mensile)	mensile	t	f	t	t	2	Firma Dipendente	Firma PI	\N	\N	\N
47b366a5-955d-4ef7-b735-20b730e55f75	Horizon Europe (mensile)	mensile	t	t	t	t	1	Firma Ricercatore	\N	\N	/app/uploads/templates/47b366a5-955d-4ef7-b735-20b730e55f75.xlsx	\N
dca8eaf2-e757-4868-9073-01d60ac68bb4	POR FESR / FEAMP (mensile)	mensile	t	t	t	f	2	Firma Dipendente	Firma Responsabile Amministrativo	\N	/app/uploads/templates/dca8eaf2-e757-4868-9073-01d60ac68bb4.xlsx	\N
8ed2cb77-63b1-4f67-9547-097aaf7d907a	MISE / 5G (giornaliero)	giornaliero	t	t	t	t	3	Firma Dipendente	Firma Direttore Istituto	Firma Responsabile Progetto	/app/uploads/templates/8ed2cb77-63b1-4f67-9547-097aaf7d907a.xlsx	\N
bf33594c-bac9-47ce-aa8d-b5b14ea99afb	MISE	giornaliero	t	t	t	t	2	FIRMA P.I.	\N	\N	/app/uploads/templates/bf33594c-bac9-47ce-aa8d-b5b14ea99afb.xlsx	\N
\.


--
-- Data for Name: timesheet_cella; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.timesheet_cella (id, riga_id, giorno, ore, costo_orario_applicato, costo_calcolato) FROM stdin;
0330a2b4-1052-4a8e-aba4-d19088a362ab	af05f63b-5658-4f8e-9da4-e6d157fb6073	14	0.00	45.00	0.00
082f3d21-7229-4d36-b7a6-731eb3040922	65d11267-60b3-41cc-9922-5a9db0029659	28	0.00	45.00	0.00
09d88bb7-4c76-47c5-be9e-0ca67707dbe0	af05f63b-5658-4f8e-9da4-e6d157fb6073	17	0.00	45.00	0.00
0aa6d1eb-6eb0-46c8-8c37-46619bc9caf3	af05f63b-5658-4f8e-9da4-e6d157fb6073	7	0.00	45.00	0.00
1516dbee-cc9f-44f6-b3b0-f70855d3b277	af05f63b-5658-4f8e-9da4-e6d157fb6073	21	0.00	45.00	0.00
17ce1cb4-d022-4f79-83ad-f2f7e1b77eae	af05f63b-5658-4f8e-9da4-e6d157fb6073	12	0.00	45.00	0.00
19cb5407-42c2-4f1e-9646-c5f1d13a3a54	65d11267-60b3-41cc-9922-5a9db0029659	19	0.00	45.00	0.00
1ab1c5f1-8119-4c36-9a42-5aecc31bbd3c	65d11267-60b3-41cc-9922-5a9db0029659	11	0.00	45.00	0.00
1fe8e113-fcfe-4eba-95c2-31f9d123fea8	af05f63b-5658-4f8e-9da4-e6d157fb6073	11	0.00	45.00	0.00
263d7312-cb23-4ca9-86e8-7fefb84505a9	af05f63b-5658-4f8e-9da4-e6d157fb6073	25	0.00	45.00	0.00
2ba4c2e7-fc69-4c57-b355-5469c0e0fc7c	af05f63b-5658-4f8e-9da4-e6d157fb6073	27	0.00	45.00	0.00
31d3db66-02bf-46f0-ae03-2d65a6e43c64	af05f63b-5658-4f8e-9da4-e6d157fb6073	1	0.00	45.00	0.00
331896d4-e13a-4e3f-af46-a98185610af3	65d11267-60b3-41cc-9922-5a9db0029659	1	0.00	45.00	0.00
3cb30ecb-768b-43e4-9cc5-81148f1a0555	65d11267-60b3-41cc-9922-5a9db0029659	7	0.00	45.00	0.00
408effde-aa9b-43be-ad44-d8b24a69fbc2	65d11267-60b3-41cc-9922-5a9db0029659	16	0.00	45.00	0.00
40c58276-5b84-4e81-9e5b-740a6d0513c8	65d11267-60b3-41cc-9922-5a9db0029659	26	0.00	45.00	0.00
414f8129-051d-49b4-a212-905c75296e86	af05f63b-5658-4f8e-9da4-e6d157fb6073	18	0.00	45.00	0.00
422ae6ac-717e-4700-bdb9-da68620066e6	65d11267-60b3-41cc-9922-5a9db0029659	5	0.00	45.00	0.00
4473121f-87c6-4edd-9d88-a3d58714be23	65d11267-60b3-41cc-9922-5a9db0029659	12	0.00	45.00	0.00
501c2d21-b2c1-46e4-b64a-1a325f8a217a	af05f63b-5658-4f8e-9da4-e6d157fb6073	13	0.00	45.00	0.00
5574fdf6-deac-459a-a2dd-531390b06558	af05f63b-5658-4f8e-9da4-e6d157fb6073	10	0.00	45.00	0.00
56a604c8-a9f2-4b3a-b772-640129db5f03	af05f63b-5658-4f8e-9da4-e6d157fb6073	15	0.00	45.00	0.00
5c3ee658-edaf-4c1d-845e-f15d5756334e	af05f63b-5658-4f8e-9da4-e6d157fb6073	5	0.00	45.00	0.00
62240eb2-64ab-4976-acff-2b6a40f167bf	65d11267-60b3-41cc-9922-5a9db0029659	30	0.00	45.00	0.00
6907e96d-c68f-43ba-afeb-aca22e418b69	65d11267-60b3-41cc-9922-5a9db0029659	20	0.00	45.00	0.00
710580f7-2183-444c-b881-48f5322a8406	af05f63b-5658-4f8e-9da4-e6d157fb6073	22	0.00	45.00	0.00
726eda07-85e0-4dfb-8431-da5bcb7046da	65d11267-60b3-41cc-9922-5a9db0029659	9	0.00	45.00	0.00
7fa9db85-3567-4596-8da6-648bdf9bc403	65d11267-60b3-41cc-9922-5a9db0029659	29	0.00	45.00	0.00
80d56b4b-2aa7-47c5-b729-0e3ed4ab451a	65d11267-60b3-41cc-9922-5a9db0029659	21	0.00	45.00	0.00
825bedbd-611a-4bbc-bfd2-857ceda3dd1b	af05f63b-5658-4f8e-9da4-e6d157fb6073	6	0.00	45.00	0.00
850867b2-d62e-43a7-9289-f13ad21464ad	65d11267-60b3-41cc-9922-5a9db0029659	6	0.00	45.00	0.00
8cbc74a9-c08e-4718-ae4e-ca10ea83280a	65d11267-60b3-41cc-9922-5a9db0029659	8	0.00	45.00	0.00
91fdf9a0-8b63-4b78-a623-95a1ab3e3e84	af05f63b-5658-4f8e-9da4-e6d157fb6073	26	0.00	45.00	0.00
9d2dd296-b239-4218-bf78-d4b66d81da3f	65d11267-60b3-41cc-9922-5a9db0029659	10	0.00	45.00	0.00
9e1e5c1a-136b-4d13-a127-2bd74c2edfa0	65d11267-60b3-41cc-9922-5a9db0029659	18	0.00	45.00	0.00
a0acd6bf-4a0e-4fe4-9bba-3905b95be4d4	af05f63b-5658-4f8e-9da4-e6d157fb6073	4	4.00	45.00	180.00
a119fca2-40e9-4c63-92ec-462f451f2f5f	af05f63b-5658-4f8e-9da4-e6d157fb6073	19	0.00	45.00	0.00
a24fbd2b-52de-48cf-b735-48c8a97372cf	65d11267-60b3-41cc-9922-5a9db0029659	13	0.00	45.00	0.00
a83b40eb-7a8a-457f-bed1-0979bf28a1aa	65d11267-60b3-41cc-9922-5a9db0029659	24	0.00	45.00	0.00
aadf612b-2b11-48a8-8fc4-3d05f6468fb2	af05f63b-5658-4f8e-9da4-e6d157fb6073	23	0.00	45.00	0.00
ad315953-4c10-4977-8aa6-9af2c3732d5d	af05f63b-5658-4f8e-9da4-e6d157fb6073	16	0.00	45.00	0.00
ad618fe1-d9dd-47f9-877f-0d16d53c52d0	65d11267-60b3-41cc-9922-5a9db0029659	4	0.00	45.00	0.00
b82a9b65-ed97-4dd3-b90b-0ba3b525a596	65d11267-60b3-41cc-9922-5a9db0029659	3	0.00	45.00	0.00
b8db0b5f-3fca-4721-879b-4ce9b1569c8a	af05f63b-5658-4f8e-9da4-e6d157fb6073	20	0.00	45.00	0.00
c251f9cf-24b0-4359-b48e-b4724fb63985	65d11267-60b3-41cc-9922-5a9db0029659	15	0.00	45.00	0.00
c4673851-697d-4379-8193-03c050598697	af05f63b-5658-4f8e-9da4-e6d157fb6073	28	0.00	45.00	0.00
c5861395-d6bd-4e4a-8477-9b9cd60eb507	af05f63b-5658-4f8e-9da4-e6d157fb6073	2	0.00	45.00	0.00
cbb7680a-06ce-42e4-93b6-57d5faea57f4	af05f63b-5658-4f8e-9da4-e6d157fb6073	9	0.00	45.00	0.00
d054d56b-6807-42e1-a486-19aa4c8b3b83	65d11267-60b3-41cc-9922-5a9db0029659	2	2.00	45.00	90.00
d32bc7d7-f305-4998-882a-e26dff2bc6eb	65d11267-60b3-41cc-9922-5a9db0029659	23	0.00	45.00	0.00
d3517e74-6661-4afc-9866-26502e229237	af05f63b-5658-4f8e-9da4-e6d157fb6073	8	0.00	45.00	0.00
d42496c9-b939-4efb-8fd9-39d26850fcd0	65d11267-60b3-41cc-9922-5a9db0029659	17	0.00	45.00	0.00
dc3c5d3a-7604-48ee-887b-579c78c5316b	65d11267-60b3-41cc-9922-5a9db0029659	25	0.00	45.00	0.00
e2c0d811-c911-4acf-9d63-ab897d04fbc6	65d11267-60b3-41cc-9922-5a9db0029659	14	0.00	45.00	0.00
e6cdb681-4b6f-4882-92ed-bc4d1f3672f6	af05f63b-5658-4f8e-9da4-e6d157fb6073	3	0.00	45.00	0.00
ece62989-3d6d-491a-bde9-0473f318e89d	65d11267-60b3-41cc-9922-5a9db0029659	27	0.00	45.00	0.00
ee226a3a-4c62-4dfb-af31-c9dc103f21c8	af05f63b-5658-4f8e-9da4-e6d157fb6073	30	0.00	45.00	0.00
f169002f-0d06-490f-9246-51b555814a7d	af05f63b-5658-4f8e-9da4-e6d157fb6073	29	0.00	45.00	0.00
f1e34fd8-9597-4629-b988-30200966b0ba	65d11267-60b3-41cc-9922-5a9db0029659	22	0.00	45.00	0.00
f29c6502-2898-4efa-b812-6415758fd8da	af05f63b-5658-4f8e-9da4-e6d157fb6073	24	0.00	45.00	0.00
6b389291-b533-49a8-9ee9-c3ac9936bdca	66fef6f4-a908-4695-820e-e8ec77a25137	7	0.00	36.00	0.00
6b6bdace-74fc-41b6-8707-0919bb4eaf81	66fef6f4-a908-4695-820e-e8ec77a25137	26	0.00	36.00	0.00
6facac03-0727-49c5-a3b2-37280b6959b9	66fef6f4-a908-4695-820e-e8ec77a25137	2	1.00	36.00	36.00
77e1b4e6-4bb5-4d03-b649-92623acd7fed	66fef6f4-a908-4695-820e-e8ec77a25137	10	0.00	36.00	0.00
7a0cc761-df24-4262-aec2-16ff4c4243c1	e642a825-db2a-42bf-b71a-d022df1790dd	16	0.00	36.00	0.00
82332579-0af7-4057-a7df-8b0d3802fad3	e642a825-db2a-42bf-b71a-d022df1790dd	21	0.00	36.00	0.00
91409068-7b6b-4839-8e09-9f30e399623d	66fef6f4-a908-4695-820e-e8ec77a25137	24	0.00	36.00	0.00
92d7670c-b2f6-46fd-9fe7-f45dd65c6fbc	66fef6f4-a908-4695-820e-e8ec77a25137	8	0.00	36.00	0.00
9392f734-f914-4f89-aed3-29d7edae8090	66fef6f4-a908-4695-820e-e8ec77a25137	15	0.00	36.00	0.00
9665da1e-daba-41d0-915b-392ef51ffca6	e642a825-db2a-42bf-b71a-d022df1790dd	7	0.00	36.00	0.00
9b71a5e3-6a06-43c5-b9c8-e995910af3e0	e642a825-db2a-42bf-b71a-d022df1790dd	27	0.00	36.00	0.00
a058bade-e29b-473d-b4d0-5c1975f319ce	e642a825-db2a-42bf-b71a-d022df1790dd	30	0.00	36.00	0.00
a202dbd5-4f28-495f-813a-833111bccd58	e642a825-db2a-42bf-b71a-d022df1790dd	6	0.00	36.00	0.00
a349dd8e-0066-46fa-aad5-1f0938feec86	66fef6f4-a908-4695-820e-e8ec77a25137	16	0.00	36.00	0.00
aa970f1d-d470-4a87-bf89-f840838b0f72	66fef6f4-a908-4695-820e-e8ec77a25137	4	0.00	36.00	0.00
af1c04f7-8536-44ee-9128-4d35f64861ed	66fef6f4-a908-4695-820e-e8ec77a25137	14	0.00	36.00	0.00
af9d3f47-7ae6-488b-a1f1-02cfa6084cf9	e642a825-db2a-42bf-b71a-d022df1790dd	2	0.00	36.00	0.00
ba91ecbc-4898-4f4c-b2cb-630222f35222	66fef6f4-a908-4695-820e-e8ec77a25137	19	0.00	36.00	0.00
bbac3178-3921-4fec-9b1c-0e6e05b88ee3	e642a825-db2a-42bf-b71a-d022df1790dd	23	0.00	36.00	0.00
c14c228f-7952-4276-ab75-b4f20b011ccb	66fef6f4-a908-4695-820e-e8ec77a25137	27	0.00	36.00	0.00
c26a66fc-62a5-4da5-9673-d9ad099e346b	e642a825-db2a-42bf-b71a-d022df1790dd	10	0.00	36.00	0.00
c9716ded-675c-4c4e-a5fa-9d139b3a68df	e642a825-db2a-42bf-b71a-d022df1790dd	25	0.00	36.00	0.00
d0a92d4c-7918-4771-a357-9898980b64cc	e642a825-db2a-42bf-b71a-d022df1790dd	24	0.00	36.00	0.00
d997c3b1-be7a-42e8-baac-bf373a2032fa	e642a825-db2a-42bf-b71a-d022df1790dd	4	0.00	36.00	0.00
d9b9e29a-b5cd-4bc3-bf2d-30337fb57acd	e642a825-db2a-42bf-b71a-d022df1790dd	29	0.00	36.00	0.00
e724fb74-393c-4bf4-84dc-26a87bb85d32	66fef6f4-a908-4695-820e-e8ec77a25137	23	0.00	36.00	0.00
ec964c53-86bf-4874-a255-e0617bb94f12	e642a825-db2a-42bf-b71a-d022df1790dd	14	0.00	36.00	0.00
efdae725-e350-468b-9de8-9d0eb793073c	e642a825-db2a-42bf-b71a-d022df1790dd	15	0.00	36.00	0.00
f264a492-7315-423f-acca-9e69ea8bed05	66fef6f4-a908-4695-820e-e8ec77a25137	28	0.00	36.00	0.00
f4653236-f3bc-4693-bc61-e4315362c9a2	e642a825-db2a-42bf-b71a-d022df1790dd	13	0.00	36.00	0.00
f88222cd-3b83-40df-a430-269e03b37284	e642a825-db2a-42bf-b71a-d022df1790dd	20	0.00	36.00	0.00
fd90f464-af58-49bc-b77d-abbe4b0fc81c	e642a825-db2a-42bf-b71a-d022df1790dd	17	0.00	36.00	0.00
fdb7f4d2-9c69-4cca-bda0-084825541b3c	e642a825-db2a-42bf-b71a-d022df1790dd	28	0.00	36.00	0.00
00408d08-1163-4c60-a5e4-14e1caadedaa	d43dfdf6-af50-4861-8e97-541377c84826	23	0.00	36.00	0.00
00b6c023-6125-4cc1-9d7a-ced383452968	1e12b1d4-96f7-4749-aca4-2777ba779cee	14	0.00	36.00	0.00
03dcf01f-0db5-47af-bc39-50587f2d7389	d43dfdf6-af50-4861-8e97-541377c84826	12	0.00	36.00	0.00
084a509c-c734-44ef-9165-cfe4aad8f84a	d43dfdf6-af50-4861-8e97-541377c84826	9	0.00	36.00	0.00
0ed35d2a-184b-4ba8-8d45-04586c488c96	d43dfdf6-af50-4861-8e97-541377c84826	17	0.00	36.00	0.00
0fe952f0-2474-49aa-aa9f-c3f02c5c0c6f	d43dfdf6-af50-4861-8e97-541377c84826	3	0.00	36.00	0.00
1b1a62d3-899c-4321-a771-345b92a276af	1e12b1d4-96f7-4749-aca4-2777ba779cee	4	0.00	36.00	0.00
1baa866b-931f-4965-80fa-e9821adda00e	d43dfdf6-af50-4861-8e97-541377c84826	19	0.00	36.00	0.00
1bec0854-91ad-42db-aaf1-12ca5b99d5e6	1e12b1d4-96f7-4749-aca4-2777ba779cee	15	0.00	36.00	0.00
2683b498-d1cc-4da1-ab97-6fa148068174	d43dfdf6-af50-4861-8e97-541377c84826	31	0.00	36.00	0.00
26dcb91f-5e70-4f7c-9282-947b1c3d141a	1e12b1d4-96f7-4749-aca4-2777ba779cee	21	0.00	36.00	0.00
2da311e4-fa04-4fd7-98f2-9d55c84bf505	d43dfdf6-af50-4861-8e97-541377c84826	25	0.00	36.00	0.00
38cfea45-feda-4f35-8b14-5933bdc8ac0b	d43dfdf6-af50-4861-8e97-541377c84826	29	0.00	36.00	0.00
3b5ffdb0-4ab1-412f-94ac-a7d3d0977426	d43dfdf6-af50-4861-8e97-541377c84826	24	0.00	36.00	0.00
3b745b4c-d004-4809-ad55-9f1cb5625acf	d43dfdf6-af50-4861-8e97-541377c84826	7	0.00	36.00	0.00
3e2194c7-c994-4725-b3ff-fc1f94150df5	1e12b1d4-96f7-4749-aca4-2777ba779cee	9	0.00	36.00	0.00
3f42be1f-2e60-4a59-b029-27b51e8a0ce9	1e12b1d4-96f7-4749-aca4-2777ba779cee	6	0.00	36.00	0.00
49ffb449-c749-4bfc-aacf-e66fdcb9b840	d43dfdf6-af50-4861-8e97-541377c84826	16	0.00	36.00	0.00
4c15dc8a-fe55-453b-9cd2-d1b854937ab7	1e12b1d4-96f7-4749-aca4-2777ba779cee	20	0.00	36.00	0.00
4c4fa594-d6c1-4ce3-9123-671273e30df2	d43dfdf6-af50-4861-8e97-541377c84826	14	0.00	36.00	0.00
4de49266-e6ec-4921-9733-89272f71545e	1e12b1d4-96f7-4749-aca4-2777ba779cee	18	0.00	36.00	0.00
52d0c6ae-06e5-4e13-b472-1478f56d9f0f	1e12b1d4-96f7-4749-aca4-2777ba779cee	19	0.00	36.00	0.00
568700aa-d166-4b83-a53c-551fa4631dd6	d43dfdf6-af50-4861-8e97-541377c84826	28	0.00	36.00	0.00
5729fa1a-d33d-4100-ab87-31177af629f8	d43dfdf6-af50-4861-8e97-541377c84826	15	0.00	36.00	0.00
60bef3da-f01f-484d-8965-a357d10a60fe	1e12b1d4-96f7-4749-aca4-2777ba779cee	22	0.00	36.00	0.00
63cf0b01-506c-4870-81dd-c51374775fda	d43dfdf6-af50-4861-8e97-541377c84826	6	0.00	36.00	0.00
7fc49850-29d0-453a-824f-3e73774ea903	d43dfdf6-af50-4861-8e97-541377c84826	11	0.00	36.00	0.00
83f1fd1c-86bb-4e51-91fb-53371baed166	d43dfdf6-af50-4861-8e97-541377c84826	30	0.00	36.00	0.00
8c335ee1-7e4e-4a1c-a2e1-3bfa481af05a	d43dfdf6-af50-4861-8e97-541377c84826	21	0.00	36.00	0.00
8f4d6db0-4ef0-499d-bf96-5c86e885e0d1	1e12b1d4-96f7-4749-aca4-2777ba779cee	3	0.00	36.00	0.00
8fc2793e-2141-4cba-8dda-20dd97c7a4f9	1e12b1d4-96f7-4749-aca4-2777ba779cee	2	2.00	36.00	72.00
964098d3-2c9f-4d82-abdd-4b1a30b7b9da	d43dfdf6-af50-4861-8e97-541377c84826	5	0.00	36.00	0.00
99f9551d-244c-4a7c-8769-c1b316b12c41	d43dfdf6-af50-4861-8e97-541377c84826	26	0.00	36.00	0.00
9d959e49-8c7b-4c17-bfff-50927eec7fff	d43dfdf6-af50-4861-8e97-541377c84826	4	0.00	36.00	0.00
a0e0e2f7-cdca-43b0-be22-84778b45a3aa	d43dfdf6-af50-4861-8e97-541377c84826	13	0.00	36.00	0.00
aa48ef34-265e-48c7-8751-128632a93645	1e12b1d4-96f7-4749-aca4-2777ba779cee	17	0.00	36.00	0.00
acacf88d-0628-40a3-ab3a-ef3b0a356570	d43dfdf6-af50-4861-8e97-541377c84826	18	0.00	36.00	0.00
b1c94aba-5ac9-42e8-ad2d-8ad95f89eacb	1e12b1d4-96f7-4749-aca4-2777ba779cee	12	0.00	36.00	0.00
b70fd300-b6bc-459b-a7bd-fd7f087aa1db	1e12b1d4-96f7-4749-aca4-2777ba779cee	8	0.00	36.00	0.00
b91f112f-81b8-4a9d-827f-c0fc80e3e79c	1e12b1d4-96f7-4749-aca4-2777ba779cee	13	0.00	36.00	0.00
ba5c44d5-3f46-422c-bc1c-a2811f6fd0fa	1e12b1d4-96f7-4749-aca4-2777ba779cee	5	0.00	36.00	0.00
bdc3d033-e20d-4d6e-9b92-b83e755b6ab8	1e12b1d4-96f7-4749-aca4-2777ba779cee	10	0.00	36.00	0.00
c1a12f2e-17e9-4708-be22-c62d7583e5c8	d43dfdf6-af50-4861-8e97-541377c84826	8	0.00	36.00	0.00
cfdea6af-9574-4ebc-be48-0e042ab89de1	d43dfdf6-af50-4861-8e97-541377c84826	1	1.00	36.00	36.00
d355288b-ad20-48a8-826a-f1cd155d76c9	d43dfdf6-af50-4861-8e97-541377c84826	2	0.00	36.00	0.00
d6bca1e8-6c19-4bce-8246-0338c0d4081a	1e12b1d4-96f7-4749-aca4-2777ba779cee	16	0.00	36.00	0.00
da87ed77-9a6d-4da1-ac09-f9f37c64bdd6	1e12b1d4-96f7-4749-aca4-2777ba779cee	7	0.00	36.00	0.00
daff59ea-6264-4fb9-9e05-7d769de3ecf7	d43dfdf6-af50-4861-8e97-541377c84826	22	0.00	36.00	0.00
de579f0d-5b86-4f52-8db0-3f6fc64a5066	d43dfdf6-af50-4861-8e97-541377c84826	27	0.00	36.00	0.00
e02aa517-3639-4743-bb0d-b77956616f60	1e12b1d4-96f7-4749-aca4-2777ba779cee	11	0.00	36.00	0.00
e37d670e-210d-470a-8bb1-c88fa4679d3d	1e12b1d4-96f7-4749-aca4-2777ba779cee	1	0.00	36.00	0.00
fa44f82b-157e-40d8-b19f-cc992a7a8f2e	d43dfdf6-af50-4861-8e97-541377c84826	20	0.00	36.00	0.00
fb82275c-5fe3-497f-b76d-2ae75a217e5e	d43dfdf6-af50-4861-8e97-541377c84826	10	0.00	36.00	0.00
963880d8-159e-4576-bdd6-e61acbacebe1	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	1	0.00	\N	\N
9bcacfa4-7658-4144-8de9-a7d2dda5860d	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	2	0.00	\N	\N
51e54f52-99b6-4bbb-8e4e-081d8c54f7c3	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	3	0.00	\N	\N
c290c385-0383-46bc-9449-039925a6aa5f	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	4	0.00	\N	\N
3adb8d2b-2c6d-4971-bb23-3add595c7248	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	5	0.00	\N	\N
03e8cf80-e27c-4efa-aedb-c65d56ff2a1a	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	6	0.00	\N	\N
1e4cc526-2eb2-44db-845e-7ae7a321e69a	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	7	0.00	\N	\N
23971463-fecd-4246-87a9-e35f793643a7	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	8	0.00	\N	\N
b9ae5309-03d6-4fcb-800b-39b6b0ec0d16	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	9	0.00	\N	\N
c2b118de-a95a-4412-a0d6-16f7ebbbb73b	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	10	0.00	\N	\N
664174a4-8123-40e5-9083-89c16c5f5f17	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	11	0.00	\N	\N
a4afdf96-9934-4de1-9686-fa6e72a336fe	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	12	0.00	\N	\N
7b39cc0b-ce29-4752-84c9-6ce6c58b4204	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	13	0.00	\N	\N
115d0299-86c7-42ad-bf15-fc2044df0c7a	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	14	0.00	\N	\N
856a4c7c-63b7-49c3-9683-8ac027adc1b5	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	15	0.00	\N	\N
9546b187-9a06-4f4b-8b38-ac1124b07401	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	16	0.00	\N	\N
f91dbbbe-816c-45ec-90c3-23f4dcedc7a3	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	17	0.00	\N	\N
ae094975-8419-4e04-8960-c8a661119da3	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	18	0.00	\N	\N
68f0933c-bfbf-4721-ae1a-9fa9d137a457	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	19	0.00	\N	\N
7028f8c1-1ddd-4b2a-b3ad-7e0a4c0c3e8b	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	20	0.00	\N	\N
6c1fcc23-ff51-43a0-8a09-8faa0265df21	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	21	0.00	\N	\N
1e7e5fae-2e04-45a0-a48f-e670bb6c430d	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	22	0.00	\N	\N
b6ce4ae3-8e8d-4919-a0e7-a17969021d8d	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	23	0.00	\N	\N
4dc22733-c066-47f7-aeb5-b3d28e648233	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	24	0.00	\N	\N
bc43cce2-a841-481c-a38a-be8a8f5d199e	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	25	0.00	\N	\N
abe16db3-1262-410c-a6a5-88fd0a0efb85	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	26	0.00	\N	\N
3f1efe00-08e3-4205-b987-50a4af7ea03f	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	27	0.00	\N	\N
649a5f7e-7f50-48ee-a51b-8a8a222e9b49	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	28	0.00	\N	\N
601ce667-87fa-477b-879a-541f8d051581	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	29	0.00	\N	\N
74ffd5e3-3fbb-4857-a10b-d99086177729	bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	30	0.00	\N	\N
0da9fc25-e6d0-4e88-aeaf-64f6822df272	fccbbe6e-b981-4e70-8bb1-43429833d561	1	0.00	\N	\N
198201db-dce6-496c-bf3d-b620eff703e9	fccbbe6e-b981-4e70-8bb1-43429833d561	2	0.00	\N	\N
fb638e62-128e-4be2-bb8d-58b8f3372452	fccbbe6e-b981-4e70-8bb1-43429833d561	3	0.00	\N	\N
b476b6c0-eb8f-4c13-8b3d-811e04b07f01	fccbbe6e-b981-4e70-8bb1-43429833d561	4	0.00	\N	\N
428a66ad-afbf-4eb0-9d2c-26a6c2d9e29f	fccbbe6e-b981-4e70-8bb1-43429833d561	5	0.00	\N	\N
cbd0da07-17a4-4e31-a068-15d097a8332e	fccbbe6e-b981-4e70-8bb1-43429833d561	6	0.00	\N	\N
b987742a-c421-40a6-9545-e4b3b5bb96eb	b85ef4a8-77d5-4f40-9384-68262469a5e0	1	0.00	\N	\N
3e93788b-612b-4aea-a1cb-17b6a9537896	b85ef4a8-77d5-4f40-9384-68262469a5e0	2	0.00	\N	\N
2c144407-b71e-4d3a-b753-24eee9bad372	b85ef4a8-77d5-4f40-9384-68262469a5e0	3	0.00	\N	\N
3b7198bd-2765-4536-b789-1420ccd8a29b	b85ef4a8-77d5-4f40-9384-68262469a5e0	4	0.00	\N	\N
ec340f85-ef69-4abe-bb42-d6674f50b8e0	b85ef4a8-77d5-4f40-9384-68262469a5e0	5	0.00	\N	\N
a03c32c0-1261-45a5-a6a9-67cbcb03f723	b85ef4a8-77d5-4f40-9384-68262469a5e0	6	0.00	\N	\N
5e5ef0e2-3368-4fa9-8f08-ebb361c73353	b85ef4a8-77d5-4f40-9384-68262469a5e0	7	0.00	\N	\N
a1a03674-a1f0-4255-a829-7b5d9baddfa3	b85ef4a8-77d5-4f40-9384-68262469a5e0	8	0.00	\N	\N
8e939d4e-f939-4f5e-ae7e-2376984a519a	b85ef4a8-77d5-4f40-9384-68262469a5e0	9	0.00	\N	\N
e4b5b486-71ed-48f3-b1d4-122ee1409720	b85ef4a8-77d5-4f40-9384-68262469a5e0	10	0.00	\N	\N
e2453019-fbbb-4b15-9cdb-cfba6fc73b34	b85ef4a8-77d5-4f40-9384-68262469a5e0	11	0.00	\N	\N
23f446bf-0aff-42f3-b648-5ed80a3c078a	b85ef4a8-77d5-4f40-9384-68262469a5e0	12	0.00	\N	\N
8da3d146-6857-42a5-98fc-02c786e5492c	b85ef4a8-77d5-4f40-9384-68262469a5e0	13	0.00	\N	\N
17a9f0a8-992f-4d36-94a3-2679ae37a470	b85ef4a8-77d5-4f40-9384-68262469a5e0	14	0.00	\N	\N
83ad971d-9833-4101-a372-c01f9da308dd	b85ef4a8-77d5-4f40-9384-68262469a5e0	15	0.00	\N	\N
db0c390e-99ad-4415-803c-b39241229116	b85ef4a8-77d5-4f40-9384-68262469a5e0	16	0.00	\N	\N
84aaa31a-3ba6-4e2b-baba-62f02292387a	b85ef4a8-77d5-4f40-9384-68262469a5e0	17	0.00	\N	\N
5ef7d8ba-e5fa-431f-b552-fb8590e87137	b85ef4a8-77d5-4f40-9384-68262469a5e0	18	0.00	\N	\N
4a62c5bf-c6d2-4937-812e-3b7cedcf64f0	b85ef4a8-77d5-4f40-9384-68262469a5e0	19	0.00	\N	\N
6385818a-3dd9-4107-84e8-fe1a02695f1f	b85ef4a8-77d5-4f40-9384-68262469a5e0	20	0.00	\N	\N
54d83b5e-2522-4187-9744-f71ca3f35ecf	b85ef4a8-77d5-4f40-9384-68262469a5e0	21	0.00	\N	\N
a80aa2be-bf6e-43e0-b995-6b8233092536	b85ef4a8-77d5-4f40-9384-68262469a5e0	22	0.00	\N	\N
43c0f715-925d-4a5d-b5ef-46057ec55359	b85ef4a8-77d5-4f40-9384-68262469a5e0	23	0.00	\N	\N
72b1075c-2e9c-4127-b2ea-3e08523cffe4	b85ef4a8-77d5-4f40-9384-68262469a5e0	24	0.00	\N	\N
b5f26945-4a13-4392-9423-92d81963238f	b85ef4a8-77d5-4f40-9384-68262469a5e0	25	0.00	\N	\N
234aa64f-dc7a-4724-a97a-7a522798beaf	b85ef4a8-77d5-4f40-9384-68262469a5e0	26	0.00	\N	\N
3cec3fb8-c3d7-421a-a58d-a8a9595083e9	b85ef4a8-77d5-4f40-9384-68262469a5e0	27	0.00	\N	\N
21949b22-2228-47e1-9506-4bae0666bdea	b85ef4a8-77d5-4f40-9384-68262469a5e0	28	0.00	\N	\N
ef13840f-8678-4cd0-a5d4-a74b2e967f81	b85ef4a8-77d5-4f40-9384-68262469a5e0	29	0.00	\N	\N
757988d4-11ee-4f3c-8c56-502df0de0842	b85ef4a8-77d5-4f40-9384-68262469a5e0	30	0.00	\N	\N
f9959fcb-6b87-4937-b93d-bf10acf4e09e	b85ef4a8-77d5-4f40-9384-68262469a5e0	31	0.00	\N	\N
e72b6357-738e-4135-a7ee-724b860f253d	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	1	0.00	\N	\N
551ef796-2245-4ff6-bd49-393e60614250	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	2	0.00	\N	\N
7fdd76a6-7528-4278-b1c4-b16ba8008b9c	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	3	0.00	\N	\N
de33881d-256e-4041-84e0-9f934942b60f	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	4	0.00	\N	\N
77e2d9ec-8a6f-43d3-8195-0d9db907c8e8	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	5	0.00	\N	\N
b75172ae-edd0-44cf-aec3-7084fb5b43d8	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	6	0.00	\N	\N
74a06200-1158-42c1-8b90-b52ff1384efb	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	7	0.00	\N	\N
d6e96577-c0ed-4ea1-a854-7f356bd5b184	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	8	0.00	\N	\N
95e8817a-8067-453b-9630-890f6b02f881	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	9	0.00	\N	\N
6d16df1d-fa19-4ed2-95ae-26b68df397d7	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	10	0.00	\N	\N
92427af1-28b3-4d53-9764-ceea59592a5b	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	11	0.00	\N	\N
8c2d0e01-551d-4b27-8f1c-9cd0000097af	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	12	0.00	\N	\N
3f4c9061-7ede-44b5-8181-9ac0a286847b	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	13	0.00	\N	\N
a01d892e-6b16-4282-923e-182134fd9ab0	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	14	0.00	\N	\N
1fa112d4-09aa-429f-8682-286fc9214dec	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	15	0.00	\N	\N
a5f8f518-6713-4324-b339-0c470a3927ec	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	16	0.00	\N	\N
410b397a-ba35-4a7e-9082-59bd320dd4aa	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	17	0.00	\N	\N
f08d88fa-bc2e-4890-bcd0-ade198bc76d6	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	18	0.00	\N	\N
1ce721bd-a5e7-4885-b292-7647d197e0ed	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	19	0.00	\N	\N
505f9e96-96a0-4df7-8992-d5a8c90084e9	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	20	0.00	\N	\N
e16c683e-8128-43fc-aaed-81d40e18be9f	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	21	0.00	\N	\N
09c3239a-eaa6-4494-8227-810cac1951c7	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	22	0.00	\N	\N
04080317-3952-4424-a10d-2876868b6111	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	23	0.00	\N	\N
0e29838b-fc9d-47e3-875b-bd9818161a1e	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	24	0.00	\N	\N
0a103b12-f3f4-493f-a701-d950bb0b7818	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	25	0.00	\N	\N
f33d6582-f920-457f-8537-4768ef5b1169	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	26	0.00	\N	\N
0155d170-0995-48d2-b577-640d04ae070d	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	27	0.00	\N	\N
40121801-dc23-4bc4-bdad-89de6196e286	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	28	0.00	\N	\N
ef48fde4-d990-4561-a129-13c180f5b9b5	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	29	0.00	\N	\N
0f1405e9-8c29-4217-9c70-c7da0c980726	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	30	0.00	\N	\N
b937fbb2-2dfe-4b2d-8190-7fc684dec0fa	4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	31	0.00	\N	\N
cdb44e33-d560-4fd4-b4dc-9b389024d11a	34f6385c-21ab-41fe-a833-04d3aa426d7e	1	0.00	\N	\N
9acb1b90-a5d3-4f7a-92c0-a9c6cddf2476	34f6385c-21ab-41fe-a833-04d3aa426d7e	2	0.00	\N	\N
0c2a9793-b161-4860-b628-ecd4e6d40527	34f6385c-21ab-41fe-a833-04d3aa426d7e	3	0.00	\N	\N
5604ea13-2e67-43d3-a635-d072ec525570	34f6385c-21ab-41fe-a833-04d3aa426d7e	4	0.00	\N	\N
a3a14380-5462-40aa-b5b2-cecb3ecdb983	34f6385c-21ab-41fe-a833-04d3aa426d7e	5	0.00	\N	\N
57399db1-30bd-4ced-a3ea-f06c59a5ca43	34f6385c-21ab-41fe-a833-04d3aa426d7e	6	0.00	\N	\N
10fa6760-9956-4fff-85c6-43c148fe2326	34f6385c-21ab-41fe-a833-04d3aa426d7e	7	0.00	\N	\N
63ea9e0a-d4e7-4331-be7e-1af19c3d6d95	34f6385c-21ab-41fe-a833-04d3aa426d7e	8	0.00	\N	\N
7cfd2123-73ad-49c9-9614-1244ea750f27	34f6385c-21ab-41fe-a833-04d3aa426d7e	9	0.00	\N	\N
47c5a564-db98-445c-b9c6-b0f232330c81	34f6385c-21ab-41fe-a833-04d3aa426d7e	10	0.00	\N	\N
fd5af5ba-7ea3-472b-8a27-ec1fb3ba9602	34f6385c-21ab-41fe-a833-04d3aa426d7e	11	0.00	\N	\N
d4b386a7-2174-4987-8ed6-68330689d5c6	34f6385c-21ab-41fe-a833-04d3aa426d7e	12	0.00	\N	\N
3944c9f1-1665-4991-b873-b6d17417bd00	34f6385c-21ab-41fe-a833-04d3aa426d7e	13	0.00	\N	\N
20eeb33a-adff-4749-99f8-db5a9adb6c63	34f6385c-21ab-41fe-a833-04d3aa426d7e	14	0.00	\N	\N
5d682801-23a6-498b-96b9-f0e3ade7e3d4	34f6385c-21ab-41fe-a833-04d3aa426d7e	15	0.00	\N	\N
309e3740-2f26-4aa9-aca5-0b7f18941875	34f6385c-21ab-41fe-a833-04d3aa426d7e	16	0.00	\N	\N
95b27f59-7c56-45d5-856e-e72c26fffeb8	34f6385c-21ab-41fe-a833-04d3aa426d7e	17	0.00	\N	\N
c18bdfbf-d3b8-430d-a109-4e8203527ec0	34f6385c-21ab-41fe-a833-04d3aa426d7e	18	0.00	\N	\N
23406979-fa67-46bf-b0b8-9fd727e2b27b	34f6385c-21ab-41fe-a833-04d3aa426d7e	19	0.00	\N	\N
c9b88205-77ee-44c7-87ff-c0b3cb10b4d2	34f6385c-21ab-41fe-a833-04d3aa426d7e	20	0.00	\N	\N
12886f23-0552-408f-bdad-515919f3060f	34f6385c-21ab-41fe-a833-04d3aa426d7e	21	0.00	\N	\N
afdadac2-f28a-42ac-9588-05b10879da6a	34f6385c-21ab-41fe-a833-04d3aa426d7e	22	0.00	\N	\N
652147a4-464e-4965-bcbe-674ac6b81560	34f6385c-21ab-41fe-a833-04d3aa426d7e	23	0.00	\N	\N
395276dd-a79f-4824-b221-f43ddc285199	34f6385c-21ab-41fe-a833-04d3aa426d7e	24	0.00	\N	\N
b0c94c2a-b2c6-41a0-81c4-a1c0375cfddb	34f6385c-21ab-41fe-a833-04d3aa426d7e	25	0.00	\N	\N
4dfc8dd4-2ac4-4d65-bf31-753b62e4dc89	34f6385c-21ab-41fe-a833-04d3aa426d7e	26	0.00	\N	\N
389a096e-c58d-4007-9808-09d565eaec5b	34f6385c-21ab-41fe-a833-04d3aa426d7e	27	0.00	\N	\N
a2e54936-d369-4b01-8045-20f13e4ccbea	34f6385c-21ab-41fe-a833-04d3aa426d7e	28	0.00	\N	\N
229290da-dde0-4921-b5ff-47345ebac988	34f6385c-21ab-41fe-a833-04d3aa426d7e	29	0.00	\N	\N
0bc0f7e7-90da-4e5d-a4e7-84b8560e75d7	34f6385c-21ab-41fe-a833-04d3aa426d7e	30	0.00	\N	\N
ab64f03b-b70d-44fc-9270-750e4f5398f6	34f6385c-21ab-41fe-a833-04d3aa426d7e	31	0.00	\N	\N
0434023e-faa5-4de7-98e4-ee87169fb5e6	1e12b1d4-96f7-4749-aca4-2777ba779cee	24	0.00	36.00	0.00
08677825-2aad-419e-a696-4c0b8a4a5787	1e12b1d4-96f7-4749-aca4-2777ba779cee	23	0.00	36.00	0.00
0dbc7d99-940d-4e27-85e7-4fb338bbb561	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	20	0.00	36.00	0.00
0e18b612-1260-4c6e-ac36-d587967b1760	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	1	0.00	36.00	0.00
0f64e93f-98f4-4cf0-beea-508373c6b9ca	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	27	0.00	36.00	0.00
171fdbc2-1d8e-442c-b451-c1a40e77eb0b	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	22	0.00	36.00	0.00
1fac1bc0-4663-4598-b279-9682d2cf1b39	1e12b1d4-96f7-4749-aca4-2777ba779cee	31	0.00	36.00	0.00
205aebc5-2fd9-4eee-9c6a-9f79d47b6549	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	29	0.00	36.00	0.00
24b5ecff-6e7c-458f-a10f-d39b1e18d84b	1e12b1d4-96f7-4749-aca4-2777ba779cee	26	0.00	36.00	0.00
2de3e49e-0639-4c98-9295-228c233d6e89	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	26	0.00	36.00	0.00
355c6202-47a1-4254-9713-fb4c66f7883b	1e12b1d4-96f7-4749-aca4-2777ba779cee	25	0.00	36.00	0.00
432b91c4-6ba8-463f-bf99-61f74dcf3788	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	3	3.00	36.00	108.00
4c13dc88-5f3a-41fe-b926-de2639ac792c	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	25	0.00	36.00	0.00
5594836f-2cbf-4b14-be60-3e9d4bfa0480	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	28	0.00	36.00	0.00
58ae6941-62ce-4b05-a81d-6f8ffaa5c1a1	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	30	0.00	36.00	0.00
64da7304-0f37-4312-afea-32e25591cef9	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	9	0.00	36.00	0.00
6a4bdaaa-a850-4d43-9d6e-4a11dcca530e	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	16	0.00	36.00	0.00
741555a1-0530-4e16-b5b4-2d1a90b5db46	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	8	0.00	36.00	0.00
74a123ec-8206-4dfd-9fbe-67585007f0fe	1e12b1d4-96f7-4749-aca4-2777ba779cee	28	0.00	36.00	0.00
7a9e7e27-b7f9-4d84-bd36-e5187dbf21b9	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	19	0.00	36.00	0.00
7eb59838-3291-4455-a090-38dfa58e463d	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	5	0.00	36.00	0.00
7f1fceb5-c3dd-4391-bd52-e8aa30bbdc21	1e12b1d4-96f7-4749-aca4-2777ba779cee	27	0.00	36.00	0.00
85d52e01-3669-4eb4-975f-86232ea36bf1	1e12b1d4-96f7-4749-aca4-2777ba779cee	29	0.00	36.00	0.00
8e37b43c-2ac2-43d2-bf3d-f41abe7888f1	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	31	0.00	36.00	0.00
9f776509-cbe6-4af7-bfde-69d9af4284df	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	6	0.00	36.00	0.00
af22d37c-f852-496c-8b9b-2aa1c62e9a7d	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	17	0.00	36.00	0.00
b109eeaa-62f3-4503-8bc1-638432142ba7	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	14	0.00	36.00	0.00
b3ae847f-b34b-4d22-8b58-09f892d3887c	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	10	0.00	36.00	0.00
b744f453-bff6-4a9d-b70c-ad4068a352cb	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	18	0.00	36.00	0.00
b86917a3-9827-4a4b-a6cc-f6cc23323b86	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	13	0.00	36.00	0.00
bbd96a5f-e4e6-468a-a7d0-3acbf1eeca0a	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	4	0.00	36.00	0.00
bc383414-db09-4d6a-b083-f7249af58b96	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	23	0.00	36.00	0.00
bde0d0a1-e435-4760-80bf-e1fc239c16e6	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	15	0.00	36.00	0.00
d58f47f8-8e02-4d19-a49f-f6bf0f7dca1a	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	12	0.00	36.00	0.00
d8c8cf66-81aa-4821-8175-4307abd75896	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	11	0.00	36.00	0.00
e388ac40-dc8a-4352-a5f8-da0cf1fd5aa0	1e12b1d4-96f7-4749-aca4-2777ba779cee	30	0.00	36.00	0.00
e936a59c-c769-4a59-95d0-6c075f76530d	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	24	0.00	36.00	0.00
f6d12ac4-de3d-45ae-95de-69c0eba8e2c1	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	2	0.00	36.00	0.00
f85183e5-ee1c-4c20-9be2-0ad410ef2487	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	7	0.00	36.00	0.00
fa8fb080-623a-46d0-9620-2ae9fbd2990c	d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	21	0.00	36.00	0.00
a9b00c32-deb1-403c-b989-0dcc503f636e	fccbbe6e-b981-4e70-8bb1-43429833d561	7	0.00	\N	\N
070d733e-a4ab-42f5-ba2d-2801e53eee09	fccbbe6e-b981-4e70-8bb1-43429833d561	8	0.00	\N	\N
f987ac65-a9c7-49ae-b7fd-2831713b643a	fccbbe6e-b981-4e70-8bb1-43429833d561	9	0.00	\N	\N
18929bf9-262d-44b0-90d2-5ce699f54498	fccbbe6e-b981-4e70-8bb1-43429833d561	10	0.00	\N	\N
e9791aa5-8d55-4a5e-81a4-6c139e598b45	fccbbe6e-b981-4e70-8bb1-43429833d561	11	0.00	\N	\N
d45fcc63-8670-41b7-86f7-6264182db17a	fccbbe6e-b981-4e70-8bb1-43429833d561	12	0.00	\N	\N
7a030256-18cd-48bd-8575-8fbad92ffc08	fccbbe6e-b981-4e70-8bb1-43429833d561	13	0.00	\N	\N
c09f02c4-74b5-4e3c-b640-e4efeb262509	fccbbe6e-b981-4e70-8bb1-43429833d561	14	0.00	\N	\N
b9c53e82-7065-4235-9309-81493908a4a0	fccbbe6e-b981-4e70-8bb1-43429833d561	15	0.00	\N	\N
ad206894-22c3-4a63-ba44-08fe8bceaee7	fccbbe6e-b981-4e70-8bb1-43429833d561	16	0.00	\N	\N
f0352c58-bb80-450a-95e4-e0dce278ba87	fccbbe6e-b981-4e70-8bb1-43429833d561	17	0.00	\N	\N
e9f3d7c4-0118-4f8f-a766-9f24113c5fb6	fccbbe6e-b981-4e70-8bb1-43429833d561	18	0.00	\N	\N
be9e82ec-388d-4126-b69f-52b4e9a7926f	fccbbe6e-b981-4e70-8bb1-43429833d561	19	0.00	\N	\N
aeec3247-f93d-4511-9f63-c21ca80e469f	fccbbe6e-b981-4e70-8bb1-43429833d561	20	0.00	\N	\N
545b7cc5-5484-46e0-beb6-c2fad83ab7c4	fccbbe6e-b981-4e70-8bb1-43429833d561	21	0.00	\N	\N
e5db41e3-c298-4e4e-86ae-99d8a88163f9	fccbbe6e-b981-4e70-8bb1-43429833d561	22	0.00	\N	\N
f29b9821-25c9-43e1-9629-358e81a06121	fccbbe6e-b981-4e70-8bb1-43429833d561	23	0.00	\N	\N
964e8f97-1e3b-4b3b-bf93-342fa77c221e	fccbbe6e-b981-4e70-8bb1-43429833d561	24	0.00	\N	\N
36a778d6-8ac9-43cb-8de6-36ddcf63d0d5	fccbbe6e-b981-4e70-8bb1-43429833d561	25	0.00	\N	\N
34ce05b9-48cf-42f9-927d-130ec28fd3ef	fccbbe6e-b981-4e70-8bb1-43429833d561	26	0.00	\N	\N
cb531f72-e263-4c0f-9876-558fe0e2a2c7	fccbbe6e-b981-4e70-8bb1-43429833d561	27	0.00	\N	\N
cf50aae6-6c39-44cc-bbec-b6dc1d29f00c	fccbbe6e-b981-4e70-8bb1-43429833d561	28	0.00	\N	\N
cca47094-7560-462a-ab16-3c209aaf685c	fccbbe6e-b981-4e70-8bb1-43429833d561	29	0.00	\N	\N
647d1187-5d00-4d11-b8d8-4e90d1eb1ff8	fccbbe6e-b981-4e70-8bb1-43429833d561	30	0.00	\N	\N
9e5b3e86-960b-467c-95ec-63fd43261a4e	5137daf2-cf7a-4935-84e7-6be4eb06d0ec	0	1.50	\N	\N
56c57a1c-c059-483f-a729-40b52e0b9761	6e0707e5-5ffc-408b-af46-18153bd20fc2	0	1.50	\N	\N
2d400eb2-94d8-4ec2-8030-2d94915ed020	0d19da2c-3dae-44b9-8ea3-f0b819de2d0b	0	2.00	36.00	72.00
d4354b73-f80b-4840-8733-e6067d964dfc	33c37f9c-954e-4d44-a85b-dfaff6dc2106	0	2.00	36.00	72.00
e0c6e1be-8163-4c44-b67f-84e1d2cd84d9	6cf6ad98-0668-4d1d-a06a-2a8897165bea	0	2.00	36.00	72.00
039da776-99fb-452d-8dbf-9deb11d02ddc	66fef6f4-a908-4695-820e-e8ec77a25137	3	0.00	36.00	0.00
04a86cc1-263d-45fa-9153-93cd81155a63	66fef6f4-a908-4695-820e-e8ec77a25137	20	0.00	36.00	0.00
10ae872a-d935-4c77-806d-d7668d39f536	66fef6f4-a908-4695-820e-e8ec77a25137	30	0.00	36.00	0.00
152f113b-61d6-415d-a5b6-95ed013adb5f	66fef6f4-a908-4695-820e-e8ec77a25137	5	0.00	36.00	0.00
1ea10c5d-2c19-41d5-b332-7f8672d4abc1	e642a825-db2a-42bf-b71a-d022df1790dd	12	0.00	36.00	0.00
23e28624-2c33-4fef-aab0-dde991c3ab07	e642a825-db2a-42bf-b71a-d022df1790dd	26	0.00	36.00	0.00
2aca4314-1595-47a9-a270-9e877b1d3726	66fef6f4-a908-4695-820e-e8ec77a25137	6	0.00	36.00	0.00
31512603-6917-48da-99bb-d20fed9f9ff1	66fef6f4-a908-4695-820e-e8ec77a25137	13	0.00	36.00	0.00
31c193b1-47f0-4c4c-aaf6-6260bd431786	e642a825-db2a-42bf-b71a-d022df1790dd	5	0.00	36.00	0.00
34bb733d-0ccd-49c9-8b71-94696673ad68	66fef6f4-a908-4695-820e-e8ec77a25137	25	0.00	36.00	0.00
37d345fa-c79d-44c4-bce1-0e70f950f7c6	e642a825-db2a-42bf-b71a-d022df1790dd	19	0.00	36.00	0.00
3f36df01-3cc4-4471-b141-78545033704f	66fef6f4-a908-4695-820e-e8ec77a25137	22	0.00	36.00	0.00
43978e0d-7e4d-4621-a1d5-fd50fd4aa484	66fef6f4-a908-4695-820e-e8ec77a25137	1	0.00	36.00	0.00
482b00e4-dd0d-41ac-a685-86d6da30c6d2	e642a825-db2a-42bf-b71a-d022df1790dd	9	0.00	36.00	0.00
492f1b3e-ecb8-47a9-9df3-715377d5a7e7	66fef6f4-a908-4695-820e-e8ec77a25137	17	0.00	36.00	0.00
4933fd30-0e06-4e2d-ad58-b6f3a1fb2ec6	66fef6f4-a908-4695-820e-e8ec77a25137	11	0.00	36.00	0.00
51a26886-8dcd-48fa-bd30-dddfbdec00f6	66fef6f4-a908-4695-820e-e8ec77a25137	18	0.00	36.00	0.00
51a3c898-cf3a-425c-8e4f-d8306c6f60b3	66fef6f4-a908-4695-820e-e8ec77a25137	9	0.00	36.00	0.00
559258ad-977c-42b4-a81c-f1c48f736dc0	e642a825-db2a-42bf-b71a-d022df1790dd	11	0.00	36.00	0.00
58e4c585-c865-41a9-84ae-54b494db1e2c	66fef6f4-a908-4695-820e-e8ec77a25137	12	0.00	36.00	0.00
59b20fa5-2801-4f07-9517-177703471f59	66fef6f4-a908-4695-820e-e8ec77a25137	21	0.00	36.00	0.00
5ba89923-41a6-4f0a-a51c-56b64e619f1f	66fef6f4-a908-4695-820e-e8ec77a25137	29	0.00	36.00	0.00
5e1d1dfa-9414-4e6b-85fa-426988d21006	e642a825-db2a-42bf-b71a-d022df1790dd	1	0.00	36.00	0.00
5f284a89-14da-4d2e-9827-b31cf6ea8a33	e642a825-db2a-42bf-b71a-d022df1790dd	18	0.00	36.00	0.00
622f0d0a-81ee-407e-aa18-192622b06a83	e642a825-db2a-42bf-b71a-d022df1790dd	3	2.00	36.00	72.00
641f8e37-1305-4c94-aa03-a6176d3d247a	e642a825-db2a-42bf-b71a-d022df1790dd	8	0.00	36.00	0.00
650ff93a-3183-44d6-964f-ee94ef5e94d1	e642a825-db2a-42bf-b71a-d022df1790dd	22	0.00	36.00	0.00
d9b079ea-8860-4f6d-8b5c-be55069d8bd5	c494efc7-ad9d-48a5-9d3a-5133e4185e72	1	0.00	\N	\N
70c9457d-645a-4e4f-a4cd-85580dddcb6b	c494efc7-ad9d-48a5-9d3a-5133e4185e72	2	0.00	\N	\N
f24d8c09-fedb-4be2-9efe-ef7c1fe8695d	c494efc7-ad9d-48a5-9d3a-5133e4185e72	3	0.00	\N	\N
0eadf707-9d72-40a4-bab7-60f01f3b63e8	c494efc7-ad9d-48a5-9d3a-5133e4185e72	4	0.00	\N	\N
0e59a1a9-3a47-4256-98ff-dc5414e12beb	c494efc7-ad9d-48a5-9d3a-5133e4185e72	5	0.00	\N	\N
e007d5fb-4fab-40d3-b695-55c76b30e376	c494efc7-ad9d-48a5-9d3a-5133e4185e72	6	0.00	\N	\N
77421b37-90e5-4c26-bcdc-a7f9ebeb9509	c494efc7-ad9d-48a5-9d3a-5133e4185e72	7	0.00	\N	\N
906b56ac-aa48-48bf-a55e-aa42759f0e5d	c494efc7-ad9d-48a5-9d3a-5133e4185e72	8	0.00	\N	\N
a10f7775-d230-4345-b44f-3bd4e2346332	c494efc7-ad9d-48a5-9d3a-5133e4185e72	9	0.00	\N	\N
18e85e69-a4ed-4f7d-88ab-48a6296ed528	c494efc7-ad9d-48a5-9d3a-5133e4185e72	10	0.00	\N	\N
dfdc459d-ae0a-4a7b-aaea-24bd57c08775	c494efc7-ad9d-48a5-9d3a-5133e4185e72	11	0.00	\N	\N
b645eedb-affc-4109-b2b5-e0f1a05be592	c494efc7-ad9d-48a5-9d3a-5133e4185e72	12	0.00	\N	\N
42f4f43d-c01b-4159-9204-33ede56f9f75	c494efc7-ad9d-48a5-9d3a-5133e4185e72	13	0.00	\N	\N
6b5e10e9-10ad-4540-85fc-fda426680715	c494efc7-ad9d-48a5-9d3a-5133e4185e72	14	0.00	\N	\N
817eaf19-6c19-4b51-b78d-f1062c73831a	c494efc7-ad9d-48a5-9d3a-5133e4185e72	15	0.00	\N	\N
7b6af2c8-2954-4357-814c-b002cffbee67	c494efc7-ad9d-48a5-9d3a-5133e4185e72	16	0.00	\N	\N
528f5023-72de-4c14-952a-4afd0285209f	c494efc7-ad9d-48a5-9d3a-5133e4185e72	17	0.00	\N	\N
1d9b0044-f782-43aa-b80c-95ce005a90f2	c494efc7-ad9d-48a5-9d3a-5133e4185e72	18	0.00	\N	\N
c784b6fd-e33c-4e58-97d6-8bf5245799f8	c494efc7-ad9d-48a5-9d3a-5133e4185e72	19	0.00	\N	\N
ebc73703-98bb-42fc-a62e-c1c8a5fc11f7	c494efc7-ad9d-48a5-9d3a-5133e4185e72	20	0.00	\N	\N
d174c737-fc00-413b-8038-21415cf9aa95	c494efc7-ad9d-48a5-9d3a-5133e4185e72	21	0.00	\N	\N
08421274-d4a7-4ad2-a7ed-c0f63cd267d8	c494efc7-ad9d-48a5-9d3a-5133e4185e72	22	0.00	\N	\N
0035e4e7-5da9-404d-9344-e7dfd16b77a6	c494efc7-ad9d-48a5-9d3a-5133e4185e72	23	0.00	\N	\N
49db8baf-501b-484f-8681-743d62d225e6	c494efc7-ad9d-48a5-9d3a-5133e4185e72	24	0.00	\N	\N
0fee419e-ece8-4223-a9fc-203c6e6258db	c494efc7-ad9d-48a5-9d3a-5133e4185e72	25	0.00	\N	\N
b9ec78cf-d85a-44c7-82e0-c0ae58dda992	c494efc7-ad9d-48a5-9d3a-5133e4185e72	26	0.00	\N	\N
a2e1a8f5-eaaa-4217-bdd9-c38337bf5c61	c494efc7-ad9d-48a5-9d3a-5133e4185e72	27	0.00	\N	\N
4028b82d-1a86-431a-b5e5-6892978b0f5e	c494efc7-ad9d-48a5-9d3a-5133e4185e72	28	0.00	\N	\N
c5a6ff93-aba8-4a95-a5f3-76dbc2eb7c73	c494efc7-ad9d-48a5-9d3a-5133e4185e72	29	0.00	\N	\N
9a21ab35-9b58-4fa9-ac8d-babe79aef806	c494efc7-ad9d-48a5-9d3a-5133e4185e72	30	0.00	\N	\N
afa9e5b3-4297-4317-9192-a8f59818cbe4	2b95b39a-032a-4c59-99f6-692b358b5eb9	1	0.00	\N	\N
9fef9913-9e7a-4d48-97b0-fc9435d5cd5d	2b95b39a-032a-4c59-99f6-692b358b5eb9	2	0.00	\N	\N
8a17ddf0-3c1d-44a0-988d-13189871e022	2b95b39a-032a-4c59-99f6-692b358b5eb9	3	0.00	\N	\N
415a1c7d-d363-478f-af14-047499532f89	2b95b39a-032a-4c59-99f6-692b358b5eb9	4	0.00	\N	\N
8a77b745-6ffb-4732-b00a-90191524a40b	2b95b39a-032a-4c59-99f6-692b358b5eb9	5	0.00	\N	\N
3c2016d8-8781-4c77-a5ac-299e8b883e50	2b95b39a-032a-4c59-99f6-692b358b5eb9	6	0.00	\N	\N
47536540-72e6-457a-97f2-9d8599584abb	2b95b39a-032a-4c59-99f6-692b358b5eb9	7	0.00	\N	\N
8099d9da-fcf5-4915-9193-fdec51dc963e	2b95b39a-032a-4c59-99f6-692b358b5eb9	8	0.00	\N	\N
73222acc-7534-44b7-873e-602a392a3b1d	2b95b39a-032a-4c59-99f6-692b358b5eb9	9	0.00	\N	\N
cb3418e3-0ce0-4cca-8cd0-aeebdf611f91	2b95b39a-032a-4c59-99f6-692b358b5eb9	10	0.00	\N	\N
0cfe9cee-8c69-424c-a9f2-357b786a20be	2b95b39a-032a-4c59-99f6-692b358b5eb9	11	0.00	\N	\N
4ece295e-ea10-4a99-9fed-0c610ac7d42f	2b95b39a-032a-4c59-99f6-692b358b5eb9	12	0.00	\N	\N
f51ca834-19ca-4563-b6de-f778902b2126	2b95b39a-032a-4c59-99f6-692b358b5eb9	13	0.00	\N	\N
86068375-e063-44e3-9d49-e4affdca37f3	2b95b39a-032a-4c59-99f6-692b358b5eb9	14	0.00	\N	\N
f3abbb99-1685-4c98-9c4b-bcf1072e5792	2b95b39a-032a-4c59-99f6-692b358b5eb9	15	0.00	\N	\N
ecff7d55-b9f2-4bbb-ab3c-d3b72f74eda5	2b95b39a-032a-4c59-99f6-692b358b5eb9	16	0.00	\N	\N
094315a6-f61f-4e9b-aae1-effb196e01c0	2b95b39a-032a-4c59-99f6-692b358b5eb9	17	0.00	\N	\N
21f080b9-be0b-48b9-961a-6e970a3e0587	2b95b39a-032a-4c59-99f6-692b358b5eb9	18	0.00	\N	\N
5aeb0ca1-2c06-4312-98a1-a2668a95c5d9	2b95b39a-032a-4c59-99f6-692b358b5eb9	19	0.00	\N	\N
c65e74e5-a7e6-42c4-87c0-550e8bec0c02	2b95b39a-032a-4c59-99f6-692b358b5eb9	20	0.00	\N	\N
9fad8abd-ac69-4338-869e-d07b233d7ae3	2b95b39a-032a-4c59-99f6-692b358b5eb9	21	0.00	\N	\N
6cef472b-e185-48ba-b2e8-148e102d388f	2b95b39a-032a-4c59-99f6-692b358b5eb9	22	0.00	\N	\N
d40d0e76-cc9e-4774-a239-b58403f77afe	2b95b39a-032a-4c59-99f6-692b358b5eb9	23	0.00	\N	\N
f08e6c91-0902-4cd0-a1b9-0d6a07938f1d	2b95b39a-032a-4c59-99f6-692b358b5eb9	24	0.00	\N	\N
e9d72975-c1dc-452b-a8fb-39aa08481d50	2b95b39a-032a-4c59-99f6-692b358b5eb9	25	0.00	\N	\N
48088303-fd70-4ed7-8410-c601eac7f1a4	2b95b39a-032a-4c59-99f6-692b358b5eb9	26	0.00	\N	\N
7066480c-0063-4d7e-8d7a-af5466a321a1	2b95b39a-032a-4c59-99f6-692b358b5eb9	27	0.00	\N	\N
8344e8f7-6b90-4b46-9b02-1e4e7d8bb8bc	2b95b39a-032a-4c59-99f6-692b358b5eb9	28	0.00	\N	\N
7417851d-1840-454a-a0ba-bb8d91bd7468	2b95b39a-032a-4c59-99f6-692b358b5eb9	29	0.00	\N	\N
fa1707b3-d728-411f-9895-0103d9c5d415	2b95b39a-032a-4c59-99f6-692b358b5eb9	30	0.00	\N	\N
\.


--
-- Data for Name: timesheet_riga; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.timesheet_riga (id, testata_id, tipo_riga, wp_id, task_id, progetto_correlato_id, descrizione_libera, ordine) FROM stdin;
d43dfdf6-af50-4861-8e97-541377c84826	2495019e-b989-4c48-a714-5b1fbd1d0396	progetto	055bb11e-878c-49be-971c-3f51d8035b63	\N	\N	wp2 — test	0
1e12b1d4-96f7-4749-aca4-2777ba779cee	2495019e-b989-4c48-a714-5b1fbd1d0396	progetto	08dee18c-4615-45d0-8414-baa28456b8fa	\N	\N	wp3 — dissemination	1
d8d00ea3-a7be-42ad-8ecb-e885a0df76a7	2495019e-b989-4c48-a714-5b1fbd1d0396	progetto	b1576241-23d3-4171-9b6a-651d601ec0d7	\N	\N	WP1 — State of the Art	2
b85ef4a8-77d5-4f40-9384-68262469a5e0	2495019e-b989-4c48-a714-5b1fbd1d0396	altri_progetti	\N	\N	\N	Altri progetti finanziati	3
4db9a1eb-af3f-46e3-b2fc-685ce6b2ff7f	2495019e-b989-4c48-a714-5b1fbd1d0396	ordinaria	\N	\N	\N	Attività ordinaria / non progettuale	4
34f6385c-21ab-41fe-a833-04d3aa426d7e	2495019e-b989-4c48-a714-5b1fbd1d0396	assenze	\N	\N	\N	Malattia / Ferie / Permessi	5
65d11267-60b3-41cc-9922-5a9db0029659	c64919f6-3f02-4904-a4a8-4135c3142653	progetto	7111860f-21e5-4fb5-b423-5fd40e8ad43c	\N	\N	WP1 — Stato dell'arte	0
af05f63b-5658-4f8e-9da4-e6d157fb6073	c64919f6-3f02-4904-a4a8-4135c3142653	progetto	6d3c4953-911d-4a04-8404-8f1bd360f2f7	\N	\N	WP2 — architettura	1
bd0ce6a9-f918-4f8b-b62a-b02fb5749cdd	c64919f6-3f02-4904-a4a8-4135c3142653	ordinaria	\N	\N	\N	Attività ordinaria / non progettuale	2
fccbbe6e-b981-4e70-8bb1-43429833d561	c64919f6-3f02-4904-a4a8-4135c3142653	assenze	\N	\N	\N	Malattia / Ferie / Permessi	3
66fef6f4-a908-4695-820e-e8ec77a25137	8a950c4d-fb82-4a96-bf50-9a197043b813	progetto	7111860f-21e5-4fb5-b423-5fd40e8ad43c	\N	\N	WP1 — Stato dell'arte	0
e642a825-db2a-42bf-b71a-d022df1790dd	8a950c4d-fb82-4a96-bf50-9a197043b813	progetto	6d3c4953-911d-4a04-8404-8f1bd360f2f7	\N	\N	WP2 — architettura	1
c494efc7-ad9d-48a5-9d3a-5133e4185e72	8a950c4d-fb82-4a96-bf50-9a197043b813	ordinaria	\N	\N	\N	Attività ordinaria / non progettuale	2
2b95b39a-032a-4c59-99f6-692b358b5eb9	8a950c4d-fb82-4a96-bf50-9a197043b813	assenze	\N	\N	\N	Malattia / Ferie / Permessi	3
33c37f9c-954e-4d44-a85b-dfaff6dc2106	9ab83d71-dc14-4393-a5b4-6703733c4525	progetto	055bb11e-878c-49be-971c-3f51d8035b63	\N	\N	wp2 — test	0
6cf6ad98-0668-4d1d-a06a-2a8897165bea	9ab83d71-dc14-4393-a5b4-6703733c4525	progetto	08dee18c-4615-45d0-8414-baa28456b8fa	\N	\N	wp3 — dissemination	1
0d19da2c-3dae-44b9-8ea3-f0b819de2d0b	9ab83d71-dc14-4393-a5b4-6703733c4525	progetto	b1576241-23d3-4171-9b6a-651d601ec0d7	\N	\N	WP1 — State of the Art	2
5137daf2-cf7a-4935-84e7-6be4eb06d0ec	9ab83d71-dc14-4393-a5b4-6703733c4525	ordinaria	\N	\N	\N	Attività ordinaria / non progettuale	3
6e0707e5-5ffc-408b-af46-18153bd20fc2	9ab83d71-dc14-4393-a5b4-6703733c4525	assenze	\N	\N	\N	Malattia / Ferie / Permessi	4
\.


--
-- Data for Name: timesheet_testata; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.timesheet_testata (id, persona_id, progetto_id, template_id, anno, mese, sal_id, stato, inviato_at, approvato_at, granularita) FROM stdin;
9ab83d71-dc14-4393-a5b4-6703733c4525	da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	6bcd8646-ca02-48a0-bf61-32103ad9cf88	2026	1	79035fd7-1f51-4ef9-a515-348d2bdb2382	approvato	2026-06-10 12:05:52.823223+00	2026-06-10 12:06:15.184788+00	mensile
2495019e-b989-4c48-a714-5b1fbd1d0396	2fad3a41-f5b7-4d73-b9ce-f6f58450eb7c	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	8ed2cb77-63b1-4f67-9547-097aaf7d907a	2026	3	2557b252-08d4-4ce8-96a0-5ddf934bf31d	approvato	2026-04-07 19:44:00.74857+00	2026-04-07 19:44:02.681133+00	giornaliero
c64919f6-3f02-4904-a4a8-4135c3142653	f57baf3d-9496-46c3-a0e8-280d8ba97886	fe5b6c6d-eacd-41a9-a943-9d2b573fd94c	6bcd8646-ca02-48a0-bf61-32103ad9cf88	2026	6	\N	approvato	2026-05-07 16:17:54.215356+00	2026-05-07 16:24:27.59081+00	giornaliero
8a950c4d-fb82-4a96-bf50-9a197043b813	da279915-38fe-4ffb-9ba8-ecd83cc1a4b4	fe5b6c6d-eacd-41a9-a943-9d2b573fd94c	6bcd8646-ca02-48a0-bf61-32103ad9cf88	2026	6	fd081352-6ea4-4952-9323-0364d46653ab	approvato	2026-05-07 16:51:57.542334+00	2026-05-07 16:52:58.740758+00	giornaliero
\.


--
-- Data for Name: tipo_finanziamento; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tipo_finanziamento (id, nome, categoria, ente_erogante, template_timesheet_id, note_rendicontazione) FROM stdin;
8acb6e93-c48f-4617-bbba-fcc00a619671	Horizon Europe	europeo	Commissione Europea	47b366a5-955d-4ef7-b735-20b730e55f75	\N
5edc8399-72aa-4826-a5e3-95943b6f8dd2	PNRR	nazionale	MUR	dca8eaf2-e757-4868-9073-01d60ac68bb4	\N
71b2f5d1-b416-4a2e-8ff2-9d80d2b68ddd	MUR/PRIN	nazionale	MUR	dca8eaf2-e757-4868-9073-01d60ac68bb4	\N
8594ffde-3fe3-480b-95ff-cc7d887e7174	MISE	nazionale	MISE	8ed2cb77-63b1-4f67-9547-097aaf7d907a	\N
e8074681-a9e5-47ac-a6c7-327c7e4c0457	POR FESR	regionale	Regione	dca8eaf2-e757-4868-9073-01d60ac68bb4	\N
952e9fe5-40da-4021-9207-97c520dc913e	Progetto Interno	privato	Ateneo	6bcd8646-ca02-48a0-bf61-32103ad9cf88	\N
05406860-2ae1-4043-877b-3c31d0cae1ba	Commessa Esterna	privato	Privato	6bcd8646-ca02-48a0-bf61-32103ad9cf88	\N
\.


--
-- Data for Name: tipo_progetto; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tipo_progetto (id, nome) FROM stdin;
cae71a94-0bd6-4ee0-8949-dfe758639145	Horizon Europe
d823449a-3353-492a-9320-22f060ff5d04	PNRR
997c6be6-e771-4d97-a287-855bd5365549	MUR/PRIN
2288d595-0db1-4f71-840d-c27f9eba9f6d	MISE
eb907aa3-e5a7-4076-8c42-33ff91cba4b0	Interno
4572b4a9-86ed-47a2-8117-9324fdcda427	Commessa
6108d8cd-7572-4092-b623-70cece540c3b	PRA
\.


--
-- Data for Name: voce_di_costo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.voce_di_costo (id, codice, descrizione, categoria, ammissibile_horizon, ammissibile_pnrr, ammissibile_por) FROM stdin;
d82a7d64-9b83-445c-99d8-23abfb5babd7	A.1	Personale dipendente	personale	true	true	true
6bd58826-d6f1-4e8b-8a02-7d273f80ed64	A.2	Personale a contratto / assegnisti	personale	true	true	true
8dafde89-afd7-445d-96be-ff3110883134	B.1	Strumentazione e attrezzature	materiali	true	true	true
0c379a35-cf64-4e20-b634-1eb1a51355a9	B.2	Materiali di consumo	materiali	true	true	true
5de4a7f8-4a21-4edd-ba2a-cc836f43f2a8	C.1	Servizi di ricerca e consulenza	servizi	true	true	true
19cc9185-2487-43f5-824b-f0eee2bfcdb0	C.2	Servizi IT e licenze software	servizi	true	false	true
5a56a459-741b-4c01-8a22-57790bc6bb01	D.1	Missioni e trasferte	missioni	true	true	true
3ccb1ef7-455a-44b8-a8cb-6281edd4837e	D.2	Partecipazione a convegni	missioni	true	false	true
346fcf8d-8360-4492-82f6-01bf014dd9f9	E.1	Overhead / Costi indiretti	overhead	true	true	false
93be25df-0bb0-4b7f-8296-d2261dab4283	F.1	Altre spese dirette	altro	true	true	true
dfb29a5a-9c75-4034-af5e-48b3c6906226	F.2	Consulenze	altro	true	true	true
\.


--
-- Data for Name: work_package; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.work_package (id, progetto_id, codice, titolo, descrizione, data_inizio, data_fine, partner_lead_id, responsabile_id, stato) FROM stdin;
055bb11e-878c-49be-971c-3f51d8035b63	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	wp2	test	\N	2026-04-03	2026-04-16	\N	\N	pianificato
08dee18c-4615-45d0-8414-baa28456b8fa	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	wp3	dissemination	\N	2026-04-03	2026-04-16	\N	\N	pianificato
b1576241-23d3-4171-9b6a-651d601ec0d7	8808eb08-f330-4ea0-b86a-ad83ce7a3e43	WP1	State of the Art	\N	2025-07-31	2026-05-27	\N	\N	pianificato
7111860f-21e5-4fb5-b423-5fd40e8ad43c	fe5b6c6d-eacd-41a9-a943-9d2b573fd94c	WP1	Stato dell'arte	\N	2026-06-01	2026-08-31	\N	\N	pianificato
6d3c4953-911d-4a04-8404-8f1bd360f2f7	fe5b6c6d-eacd-41a9-a943-9d2b573fd94c	WP2	architettura	Definizione architettura	2026-06-02	2026-10-29	\N	\N	pianificato
\.


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: allocazione allocazione_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocazione
    ADD CONSTRAINT allocazione_pkey PRIMARY KEY (id);


--
-- Name: approvazione_timesheet approvazione_timesheet_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvazione_timesheet
    ADD CONSTRAINT approvazione_timesheet_pkey PRIMARY KEY (id);


--
-- Name: budget_voce budget_voce_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_voce
    ADD CONSTRAINT budget_voce_pkey PRIMARY KEY (id);


--
-- Name: costo_orario_persona costo_orario_persona_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.costo_orario_persona
    ADD CONSTRAINT costo_orario_persona_pkey PRIMARY KEY (id);


--
-- Name: deliverable deliverable_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliverable
    ADD CONSTRAINT deliverable_pkey PRIMARY KEY (id);


--
-- Name: dipartimento dipartimento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dipartimento
    ADD CONSTRAINT dipartimento_pkey PRIMARY KEY (id);


--
-- Name: documento_progetto documento_progetto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_progetto
    ADD CONSTRAINT documento_progetto_pkey PRIMARY KEY (id);


--
-- Name: erogazione erogazione_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erogazione
    ADD CONSTRAINT erogazione_pkey PRIMARY KEY (id);


--
-- Name: finanziamento finanziamento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finanziamento
    ADD CONSTRAINT finanziamento_pkey PRIMARY KEY (id);


--
-- Name: impegno impegno_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impegno
    ADD CONSTRAINT impegno_pkey PRIMARY KEY (id);


--
-- Name: milestone milestone_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone
    ADD CONSTRAINT milestone_pkey PRIMARY KEY (id);


--
-- Name: monte_ore_annuale monte_ore_annuale_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monte_ore_annuale
    ADD CONSTRAINT monte_ore_annuale_pkey PRIMARY KEY (id);


--
-- Name: notifica notifica_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifica
    ADD CONSTRAINT notifica_pkey PRIMARY KEY (id);


--
-- Name: partner partner_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner
    ADD CONSTRAINT partner_pkey PRIMARY KEY (id);


--
-- Name: persona persona_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persona
    ADD CONSTRAINT persona_pkey PRIMARY KEY (id);


--
-- Name: progetto_partner progetto_partner_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progetto_partner
    ADD CONSTRAINT progetto_partner_pkey PRIMARY KEY (id);


--
-- Name: progetto progetto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progetto
    ADD CONSTRAINT progetto_pkey PRIMARY KEY (id);


--
-- Name: proposta_partner proposta_partner_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposta_partner
    ADD CONSTRAINT proposta_partner_pkey PRIMARY KEY (id);


--
-- Name: proposta proposta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposta
    ADD CONSTRAINT proposta_pkey PRIMARY KEY (id);


--
-- Name: richiesta_autorizzazione_spesa richiesta_autorizzazione_spesa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.richiesta_autorizzazione_spesa
    ADD CONSTRAINT richiesta_autorizzazione_spesa_pkey PRIMARY KEY (id);


--
-- Name: sal sal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sal
    ADD CONSTRAINT sal_pkey PRIMARY KEY (id);


--
-- Name: spesa spesa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spesa
    ADD CONSTRAINT spesa_pkey PRIMARY KEY (id);


--
-- Name: task task_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_pkey PRIMARY KEY (id);


--
-- Name: template_timesheet template_timesheet_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_timesheet
    ADD CONSTRAINT template_timesheet_pkey PRIMARY KEY (id);


--
-- Name: timesheet_cella timesheet_cella_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheet_cella
    ADD CONSTRAINT timesheet_cella_pkey PRIMARY KEY (id);


--
-- Name: timesheet_riga timesheet_riga_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheet_riga
    ADD CONSTRAINT timesheet_riga_pkey PRIMARY KEY (id);


--
-- Name: timesheet_testata timesheet_testata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheet_testata
    ADD CONSTRAINT timesheet_testata_pkey PRIMARY KEY (id);


--
-- Name: tipo_finanziamento tipo_finanziamento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_finanziamento
    ADD CONSTRAINT tipo_finanziamento_pkey PRIMARY KEY (id);


--
-- Name: tipo_progetto tipo_progetto_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_progetto
    ADD CONSTRAINT tipo_progetto_nome_key UNIQUE (nome);


--
-- Name: tipo_progetto tipo_progetto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_progetto
    ADD CONSTRAINT tipo_progetto_pkey PRIMARY KEY (id);


--
-- Name: voce_di_costo voce_di_costo_codice_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voce_di_costo
    ADD CONSTRAINT voce_di_costo_codice_key UNIQUE (codice);


--
-- Name: voce_di_costo voce_di_costo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voce_di_costo
    ADD CONSTRAINT voce_di_costo_pkey PRIMARY KEY (id);


--
-- Name: work_package work_package_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_package
    ADD CONSTRAINT work_package_pkey PRIMARY KEY (id);


--
-- Name: ix_persona_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_persona_email ON public.persona USING btree (email);


--
-- Name: ix_persona_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_persona_username ON public.persona USING btree (username);


--
-- Name: ix_progetto_codice; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_progetto_codice ON public.progetto USING btree (codice);


--
-- Name: allocazione allocazione_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocazione
    ADD CONSTRAINT allocazione_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES public.persona(id);


--
-- Name: allocazione allocazione_progetto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocazione
    ADD CONSTRAINT allocazione_progetto_id_fkey FOREIGN KEY (progetto_id) REFERENCES public.progetto(id);


--
-- Name: approvazione_timesheet approvazione_timesheet_approvatore_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvazione_timesheet
    ADD CONSTRAINT approvazione_timesheet_approvatore_id_fkey FOREIGN KEY (approvatore_id) REFERENCES public.persona(id);


--
-- Name: approvazione_timesheet approvazione_timesheet_testata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvazione_timesheet
    ADD CONSTRAINT approvazione_timesheet_testata_id_fkey FOREIGN KEY (testata_id) REFERENCES public.timesheet_testata(id);


--
-- Name: budget_voce budget_voce_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_voce
    ADD CONSTRAINT budget_voce_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partner(id);


--
-- Name: budget_voce budget_voce_progetto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_voce
    ADD CONSTRAINT budget_voce_progetto_id_fkey FOREIGN KEY (progetto_id) REFERENCES public.progetto(id);


--
-- Name: budget_voce budget_voce_voce_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_voce
    ADD CONSTRAINT budget_voce_voce_id_fkey FOREIGN KEY (voce_id) REFERENCES public.voce_di_costo(id);


--
-- Name: costo_orario_persona costo_orario_persona_inserito_da_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.costo_orario_persona
    ADD CONSTRAINT costo_orario_persona_inserito_da_fkey FOREIGN KEY (inserito_da) REFERENCES public.persona(id);


--
-- Name: costo_orario_persona costo_orario_persona_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.costo_orario_persona
    ADD CONSTRAINT costo_orario_persona_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES public.persona(id);


--
-- Name: deliverable deliverable_progetto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliverable
    ADD CONSTRAINT deliverable_progetto_id_fkey FOREIGN KEY (progetto_id) REFERENCES public.progetto(id);


--
-- Name: deliverable deliverable_responsabile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliverable
    ADD CONSTRAINT deliverable_responsabile_id_fkey FOREIGN KEY (responsabile_id) REFERENCES public.persona(id);


--
-- Name: deliverable deliverable_wp_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliverable
    ADD CONSTRAINT deliverable_wp_id_fkey FOREIGN KEY (wp_id) REFERENCES public.work_package(id);


--
-- Name: dipartimento dipartimento_direttore_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dipartimento
    ADD CONSTRAINT dipartimento_direttore_id_fkey FOREIGN KEY (direttore_id) REFERENCES public.persona(id);


--
-- Name: documento_progetto documento_progetto_progetto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_progetto
    ADD CONSTRAINT documento_progetto_progetto_id_fkey FOREIGN KEY (progetto_id) REFERENCES public.progetto(id);


--
-- Name: documento_progetto documento_progetto_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_progetto
    ADD CONSTRAINT documento_progetto_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.persona(id);


--
-- Name: erogazione erogazione_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erogazione
    ADD CONSTRAINT erogazione_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.persona(id);


--
-- Name: erogazione erogazione_progetto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erogazione
    ADD CONSTRAINT erogazione_progetto_id_fkey FOREIGN KEY (progetto_id) REFERENCES public.progetto(id) ON DELETE CASCADE;


--
-- Name: finanziamento finanziamento_progetto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finanziamento
    ADD CONSTRAINT finanziamento_progetto_id_fkey FOREIGN KEY (progetto_id) REFERENCES public.progetto(id);


--
-- Name: finanziamento finanziamento_tipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finanziamento
    ADD CONSTRAINT finanziamento_tipo_id_fkey FOREIGN KEY (tipo_id) REFERENCES public.tipo_finanziamento(id);


--
-- Name: impegno impegno_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impegno
    ADD CONSTRAINT impegno_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.persona(id);


--
-- Name: impegno impegno_progetto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impegno
    ADD CONSTRAINT impegno_progetto_id_fkey FOREIGN KEY (progetto_id) REFERENCES public.progetto(id);


--
-- Name: impegno impegno_voce_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impegno
    ADD CONSTRAINT impegno_voce_id_fkey FOREIGN KEY (voce_id) REFERENCES public.voce_di_costo(id);


--
-- Name: milestone milestone_progetto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone
    ADD CONSTRAINT milestone_progetto_id_fkey FOREIGN KEY (progetto_id) REFERENCES public.progetto(id);


--
-- Name: milestone milestone_wp_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone
    ADD CONSTRAINT milestone_wp_id_fkey FOREIGN KEY (wp_id) REFERENCES public.work_package(id);


--
-- Name: monte_ore_annuale monte_ore_annuale_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monte_ore_annuale
    ADD CONSTRAINT monte_ore_annuale_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES public.persona(id);


--
-- Name: notifica notifica_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifica
    ADD CONSTRAINT notifica_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES public.persona(id);


--
-- Name: persona persona_dipartimento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persona
    ADD CONSTRAINT persona_dipartimento_id_fkey FOREIGN KEY (dipartimento_id) REFERENCES public.dipartimento(id);


--
-- Name: progetto progetto_amministrativo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progetto
    ADD CONSTRAINT progetto_amministrativo_id_fkey FOREIGN KEY (amministrativo_id) REFERENCES public.persona(id);


--
-- Name: progetto progetto_dipartimento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progetto
    ADD CONSTRAINT progetto_dipartimento_id_fkey FOREIGN KEY (dipartimento_id) REFERENCES public.dipartimento(id);


--
-- Name: progetto_partner progetto_partner_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progetto_partner
    ADD CONSTRAINT progetto_partner_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partner(id);


--
-- Name: progetto_partner progetto_partner_progetto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progetto_partner
    ADD CONSTRAINT progetto_partner_progetto_id_fkey FOREIGN KEY (progetto_id) REFERENCES public.progetto(id);


--
-- Name: progetto progetto_pi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progetto
    ADD CONSTRAINT progetto_pi_id_fkey FOREIGN KEY (pi_id) REFERENCES public.persona(id);


--
-- Name: progetto progetto_template_timesheet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progetto
    ADD CONSTRAINT progetto_template_timesheet_id_fkey FOREIGN KEY (template_timesheet_id) REFERENCES public.template_timesheet(id);


--
-- Name: proposta proposta_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposta
    ADD CONSTRAINT proposta_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.persona(id);


--
-- Name: proposta_partner proposta_partner_proposta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposta_partner
    ADD CONSTRAINT proposta_partner_proposta_id_fkey FOREIGN KEY (proposta_id) REFERENCES public.proposta(id) ON DELETE CASCADE;


--
-- Name: proposta proposta_responsabile_scientifico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposta
    ADD CONSTRAINT proposta_responsabile_scientifico_id_fkey FOREIGN KEY (responsabile_scientifico_id) REFERENCES public.persona(id);


--
-- Name: richiesta_autorizzazione_spesa richiesta_autorizzazione_spesa_budget_voce_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.richiesta_autorizzazione_spesa
    ADD CONSTRAINT richiesta_autorizzazione_spesa_budget_voce_id_fkey FOREIGN KEY (budget_voce_id) REFERENCES public.budget_voce(id);


--
-- Name: richiesta_autorizzazione_spesa richiesta_autorizzazione_spesa_dipartimento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.richiesta_autorizzazione_spesa
    ADD CONSTRAINT richiesta_autorizzazione_spesa_dipartimento_id_fkey FOREIGN KEY (dipartimento_id) REFERENCES public.dipartimento(id);


--
-- Name: richiesta_autorizzazione_spesa richiesta_autorizzazione_spesa_impegno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.richiesta_autorizzazione_spesa
    ADD CONSTRAINT richiesta_autorizzazione_spesa_impegno_id_fkey FOREIGN KEY (impegno_id) REFERENCES public.impegno(id);


--
-- Name: richiesta_autorizzazione_spesa richiesta_autorizzazione_spesa_progetto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.richiesta_autorizzazione_spesa
    ADD CONSTRAINT richiesta_autorizzazione_spesa_progetto_id_fkey FOREIGN KEY (progetto_id) REFERENCES public.progetto(id);


--
-- Name: richiesta_autorizzazione_spesa richiesta_autorizzazione_spesa_richiedente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.richiesta_autorizzazione_spesa
    ADD CONSTRAINT richiesta_autorizzazione_spesa_richiedente_id_fkey FOREIGN KEY (richiedente_id) REFERENCES public.persona(id);


--
-- Name: sal sal_progetto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sal
    ADD CONSTRAINT sal_progetto_id_fkey FOREIGN KEY (progetto_id) REFERENCES public.progetto(id);


--
-- Name: spesa spesa_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spesa
    ADD CONSTRAINT spesa_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.persona(id);


--
-- Name: spesa spesa_impegno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spesa
    ADD CONSTRAINT spesa_impegno_id_fkey FOREIGN KEY (impegno_id) REFERENCES public.impegno(id);


--
-- Name: spesa spesa_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spesa
    ADD CONSTRAINT spesa_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partner(id);


--
-- Name: spesa spesa_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spesa
    ADD CONSTRAINT spesa_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES public.persona(id);


--
-- Name: spesa spesa_progetto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spesa
    ADD CONSTRAINT spesa_progetto_id_fkey FOREIGN KEY (progetto_id) REFERENCES public.progetto(id);


--
-- Name: spesa spesa_sal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spesa
    ADD CONSTRAINT spesa_sal_id_fkey FOREIGN KEY (sal_id) REFERENCES public.sal(id);


--
-- Name: spesa spesa_spesa_origine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spesa
    ADD CONSTRAINT spesa_spesa_origine_id_fkey FOREIGN KEY (spesa_origine_id) REFERENCES public.spesa(id);


--
-- Name: spesa spesa_voce_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spesa
    ADD CONSTRAINT spesa_voce_id_fkey FOREIGN KEY (voce_id) REFERENCES public.voce_di_costo(id);


--
-- Name: task task_responsabile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_responsabile_id_fkey FOREIGN KEY (responsabile_id) REFERENCES public.persona(id);


--
-- Name: task task_wp_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_wp_id_fkey FOREIGN KEY (wp_id) REFERENCES public.work_package(id);


--
-- Name: timesheet_cella timesheet_cella_riga_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheet_cella
    ADD CONSTRAINT timesheet_cella_riga_id_fkey FOREIGN KEY (riga_id) REFERENCES public.timesheet_riga(id);


--
-- Name: timesheet_riga timesheet_riga_progetto_correlato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheet_riga
    ADD CONSTRAINT timesheet_riga_progetto_correlato_id_fkey FOREIGN KEY (progetto_correlato_id) REFERENCES public.progetto(id);


--
-- Name: timesheet_riga timesheet_riga_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheet_riga
    ADD CONSTRAINT timesheet_riga_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id);


--
-- Name: timesheet_riga timesheet_riga_testata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheet_riga
    ADD CONSTRAINT timesheet_riga_testata_id_fkey FOREIGN KEY (testata_id) REFERENCES public.timesheet_testata(id);


--
-- Name: timesheet_riga timesheet_riga_wp_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheet_riga
    ADD CONSTRAINT timesheet_riga_wp_id_fkey FOREIGN KEY (wp_id) REFERENCES public.work_package(id);


--
-- Name: timesheet_testata timesheet_testata_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheet_testata
    ADD CONSTRAINT timesheet_testata_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES public.persona(id);


--
-- Name: timesheet_testata timesheet_testata_progetto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheet_testata
    ADD CONSTRAINT timesheet_testata_progetto_id_fkey FOREIGN KEY (progetto_id) REFERENCES public.progetto(id);


--
-- Name: timesheet_testata timesheet_testata_sal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheet_testata
    ADD CONSTRAINT timesheet_testata_sal_id_fkey FOREIGN KEY (sal_id) REFERENCES public.sal(id);


--
-- Name: timesheet_testata timesheet_testata_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheet_testata
    ADD CONSTRAINT timesheet_testata_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.template_timesheet(id);


--
-- Name: tipo_finanziamento tipo_finanziamento_template_timesheet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_finanziamento
    ADD CONSTRAINT tipo_finanziamento_template_timesheet_id_fkey FOREIGN KEY (template_timesheet_id) REFERENCES public.template_timesheet(id);


--
-- Name: work_package work_package_partner_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_package
    ADD CONSTRAINT work_package_partner_lead_id_fkey FOREIGN KEY (partner_lead_id) REFERENCES public.partner(id);


--
-- Name: work_package work_package_progetto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_package
    ADD CONSTRAINT work_package_progetto_id_fkey FOREIGN KEY (progetto_id) REFERENCES public.progetto(id);


--
-- Name: work_package work_package_responsabile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_package
    ADD CONSTRAINT work_package_responsabile_id_fkey FOREIGN KEY (responsabile_id) REFERENCES public.persona(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 0CIRS0VvCsCbUkfOn3Dy6uyHzCmrCQ0vnrtLY9pJWfPUPrmBlc3m0u20OfaEL9G

