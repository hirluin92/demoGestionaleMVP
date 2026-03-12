import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DashboardPreview } from '@/components/marketing/dashboard-preview'

// Commenti in italiano: landing marketing con grafica custom fornita

export default async function MarketingHome() {
  const session = await getServerSession(authOptions)

  if (session) {
    // Redirect verso dashboard tenant-specific se disponibile
    if (session.user.tenantSlug) {
      redirect(`/${session.user.tenantSlug}/dashboard`)
    }
    redirect('/')
  }

  return (
    <>
      <main className="landing-page">
        <div className="page">
          <nav className="nav">
            <div className="container nav-inner">
              <div className="brand">Ap.</div>
              <div className="nav-links">
                <a href="#problema">Problema</a>
                <a href="#funzioni">Funzioni</a>
                <a href="#dashboard">Prodotto</a>
                <a href="#prezzi">Prezzi</a>
              </div>
              <div className="nav-actions">
                <a className="btn" href="#dashboard">
                  Guarda la demo
                </a>
                <a className="btn primary" href="#calcolatore">
                  Scopri quanto perdi
                </a>
              </div>
            </div>
          </nav>

          <section className="hero">
            <div className="container hero-grid">
              <div>
                <div className="eyebrow">
                  <span className="eyebrow-dot" />
                  Revenue engine per attività su appuntamento
                </div>
                <h1>
                  Il gestionale che <span className="gradient">genera fatturato</span>.
                </h1>
                <p>
                  Appointly non è una semplice agenda. È un CRM con AI progettato per ridurre i no-show, riempire i
                  buchi in agenda e aumentare il valore di ogni cliente.
                </p>
                <div className="hero-cta">
                  <a className="btn primary big" href="#calcolatore">
                    Scopri quanto stai perdendo
                  </a>
                  <a className="btn big" href="#dashboard">
                    Guarda la demo
                  </a>
                </div>
                <div className="hero-stats">
                  <div className="hero-stat">
                    <strong>-40%</strong>
                    <span>no-show</span>
                  </div>
                  <div className="hero-stat">
                    <strong>+34%</strong>
                    <span>incasso medio</span>
                  </div>
                  <div className="hero-stat">
                    <strong>3h</strong>
                    <span>tempo risparmiato al giorno</span>
                  </div>
                </div>
              </div>

              <DashboardPreview />
            </div>
          </section>

          <section className="section" id="calcolatore">
            <div className="container">
              <div className="section-head">
                <div className="kicker">Calcolatore</div>
                <h2>Scopri quanto fatturato stai perdendo ogni mese.</h2>
                <p>
                  Prima di parlare di funzioni, partiamo dal problema: no-show, buchi in agenda e tempo perso al
                  telefono hanno un costo reale. Appointly nasce per eliminarlo.
                </p>
              </div>

              <div className="calculator">
                <div className="card">
                  <div className="field-grid">
                    <div className="field">
                      <label>Appuntamenti a settimana</label>
                      <div className="fake-input">85</div>
                    </div>
                    <div className="field">
                      <label>Ticket medio</label>
                      <div className="fake-input">€62</div>
                    </div>
                    <div className="field">
                      <label>No-show al mese</label>
                      <div className="fake-input">10</div>
                    </div>
                    <div className="field">
                      <label>Tempo al telefono</label>
                      <div className="fake-input">2h / giorno</div>
                    </div>
                  </div>
                </div>

                <div className="card result">
                  <div className="result-box">
                    <div className="small">Perdita stimata reale</div>
                    <div className="big">€1.860 / mese</div>
                    <div
                      style={{
                        marginTop: 10,
                        color: '#DCEBFF',
                        fontSize: 14,
                      }}
                    >
                      circa <strong>€22.320 l’anno</strong> tra no-show, buchi in agenda e tempo operativo sprecato
                    </div>
                  </div>
                  <div className="result-points">
                    <div>
                      <strong>€620 / mese</strong> persi per 10 no-show con ticket medio da €62.
                    </div>
                    <div>
                      <strong>€1.240 / mese</strong> persi se lasci anche solo 1 slot vuoto al giorno.
                    </div>
                    <div>
                      <strong>44 ore / mese</strong> bruciate al telefono invece che su clienti e vendite.
                    </div>
                  </div>
                  <div className="hero-cta" style={{ marginTop: 18 }}>
                    <a className="btn primary big" href="#prezzi">
                      Recupera questo fatturato
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="section" id="funzioni">
            <div className="container">
              <div className="section-head">
                <div className="kicker">Perché funziona</div>
                <h2>Non organizza soltanto. Recupera soldi che oggi stai perdendo.</h2>
                <p>
                  La forza di Appointly è che collega agenda, automazioni e CRM in un unico flusso. Ogni funzione è
                    pensata per ridurre sprechi, aumentare presenze e migliorare il valore di ogni cliente.
                </p>
              </div>

              <div className="feature-grid">
                <div
                  className="feature-card"
                  style={{
                    background:
                      'linear-gradient(135deg,rgba(87,230,214,.12),rgba(122,168,255,.10),rgba(10,14,24,.9))',
                    borderColor: 'rgba(122,168,255,.18)',
                  }}
                >
                  <div className="icon" />
                  <h3>Meno buchi in agenda. Più giornate piene.</h3>
                  <p>
                    Appointly vede gli spazi vuoti, attiva recall intelligenti, gestisce reminder e ti aiuta a
                    recuperare fatturato che normalmente andrebbe perso.
                  </p>
                  <div className="feature-list">
                    <div>Recall automatici sui clienti dormienti</div>
                    <div>Reminder e conferme per ridurre i no-show</div>
                    <div>Suggerimenti AI per riempire gli slot vuoti</div>
                  </div>
                </div>

                <div className="feature-card">
                  <div className="icon" />
                  <h3>Più velocità operativa per il team</h3>
                  <p>
                    Calendario multi-operatore progettato per prenotazioni veloci, uso da tablet e gestione immediata di
                    spostamenti, conferme e clienti.
                  </p>
                  <div className="feature-list">
                    <div>Prenotazioni telefoniche rapide</div>
                    <div>Vista staff e disponibilità in un colpo d’occhio</div>
                    <div>Meno tempo perso tra fogli, chat e telefonate</div>
                  </div>
                </div>

                <div className="feature-card">
                  <div className="icon" />
                  <h3>Più valore da ogni cliente</h3>
                  <p>
                    Con CRM, storico e opportunità di upsell, il cliente non è più solo un appuntamento: diventa una
                    relazione che genera ritorno e spesa ricorrente.
                  </p>
                  <div className="feature-list">
                    <div>Storico servizi e preferenze</div>
                    <div>VIP, dormienti e clienti da riattivare</div>
                    <div>Upsell suggeriti al momento giusto</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="section" id="problema">
            <div className="container">
              <div className="proof-grid">
                <div>
                  <div className="section-head" style={{ marginBottom: 18 }}>
                    <div className="kicker">Risultato</div>
                    <h2>Quello che cambia davvero quando Appointly entra nel salone.</h2>
                    <p>
                      Il risultato non è “più ordine”. Il risultato è un’attività che perde meno soldi, lavora più
                      veloce e monetizza meglio ogni giornata di lavoro.
                    </p>
                  </div>
                  <div className="proof-list">
                    <div className="proof-item">
                      <strong>-40%</strong>
                      <span>no-show grazie a reminder, conferme e recall automatici.</span>
                    </div>
                    <div className="proof-item">
                      <strong>+1 slot/giorno</strong>
                      <span>recuperato con suggerimenti AI e clienti dormienti.</span>
                    </div>
                    <div className="proof-item">
                      <strong>+34%</strong>
                      <span>incremento potenziale di incasso da agenda più piena e upsell.</span>
                    </div>
                    <div className="proof-item">
                      <strong>-44h/mese</strong>
                      <span>di gestione manuale recuperate dal team.</span>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="panel-title">Caso realistico</div>
                  <div className="proof-list" style={{ gridTemplateColumns: '1fr', marginTop: 10 }}>
                    <div className="proof-item">
                      <strong>Prima</strong>
                      <span>
                        10 no-show al mese, 1 slot vuoto al giorno, clienti dormienti mai ricontattati e agenda gestita
                        spesso al telefono.
                      </span>
                    </div>
                    <div className="proof-item">
                      <strong>Dopo</strong>
                      <span>
                        Reminder automatici, recall sui clienti giusti, CRM sempre aggiornato e suggerimenti AI che
                        trasformano gli spazi vuoti in nuove prenotazioni.
                      </span>
                    </div>
                    <div className="proof-item">
                      <strong>Impatto</strong>
                      <span>
                        Più presenze, più controllo, più possibilità di upsell e una percezione molto più premium del
                        servizio.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="section" id="prezzi">
            <div className="container">
              <div className="section-head">
                <div className="kicker">Prezzi</div>
                <h2>Un pricing da revenue engine, non da agenda low-cost.</h2>
                <p>
                  Nel documento il focus è chiaro: Appointly non compete sul prezzo più basso. Compete sul ritorno
                  economico che genera. Per questo il modello giusto è una proposta guidata, con setup e piano coerenti
                  con la dimensione del salone.
                </p>
              </div>

              <div className="pricing">
                <div className="price-card">
                  <div className="panel-title">Accesso demo + proposta personalizzata</div>
                  <div className="price">Su richiesta</div>
                  <div
                    style={{
                      marginTop: 12,
                      color: 'var(--muted)',
                      fontSize: 15,
                      lineHeight: 1.6,
                    }}
                  >
                    Ti mostriamo il prodotto sul tuo caso reale e costruiamo un’offerta in base a numero operatori,
                    automazioni e obiettivi di crescita.
                  </div>
                  <div className="price-list">
                    <div>Setup iniziale e configurazione del salone</div>
                    <div>Calendario multi-operatore + CRM clienti</div>
                    <div>Automazioni, reminder e AI Concierge</div>
                    <div>Piano coerente con volumi e potenziale di fatturato</div>
                  </div>
                  <div className="hero-cta" style={{ marginTop: 22 }}>
                    <a className="btn primary big" href="#">
                      Richiedi una demo
                    </a>
                  </div>
                </div>

                <div className="faq">
                  <div className="faq-item">
                    <strong>Perché non un prezzo fisso da software economico?</strong>
                    <span>
                      Perché Appointly è pensato per incidere sul fatturato. Il valore cambia in base a staff, volumi,
                      automazioni e opportunità di recupero economico.
                    </span>
                  </div>
                  <div className="faq-item">
                    <strong>Cosa include la demo?</strong>
                    <span>
                      Analisi del tuo flusso operativo, simulazione delle perdite attuali e presentazione del prodotto
                      applicato al tuo caso reale.
                    </span>
                  </div>
                  <div className="faq-item">
                    <strong>Prezzi del documento</strong>
                    <span>
                      Questa sezione è stata resa neutra perché il file con i numeri precisi non è più leggibile in
                      questa sessione. Se me lo ricarichi, la riallineo esattamente ai prezzi previsti.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="final-cta">
            <div className="container">
              <div className="final-box">
                <h2>
                  Smetti di perdere soldi.
                  <br />
                  <span className="gradient">Inizia a generare fatturato.</span>
                </h2>
                <p>
                  Appointly unisce agenda, CRM e AI per trasformare la gestione quotidiana del tuo salone in un sistema
                  che lavora per far crescere il business.
                </p>
                <div className="hero-cta">
                  <a className="btn primary big" href="#calcolatore">
                    Scopri quanto stai perdendo
                  </a>
                  <a className="btn big" href="#dashboard">
                    Guarda la demo
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}


