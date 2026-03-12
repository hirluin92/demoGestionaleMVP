'use client'

// Commenti in italiano: anteprima dashboard con sidebar espandibile

import React, { useState } from 'react'

export function DashboardPreview(): JSX.Element {
  const [expanded, setExpanded] = useState<boolean>(false)

  const innerClassName = expanded ? 'preview-inner expanded' : 'preview-inner'

  return (
    <div className="preview" id="dashboard">
      <div className={innerClassName}>
        <aside className="preview-side">
          <div className="side-top">
            <div
              className="logo"
              id="logoToggle"
              title="Apri o chiudi menu"
              onClick={() => setExpanded((prev) => !prev)}
            >
              Ap.
            </div>
            <div className="side-stack" style={{ marginTop: 10 }}>
              <div className="side-nav-item active">
                <span className="side-nav-icon" aria-hidden="true" />
                <span className="side-nav-label">Dashboard</span>
              </div>
              <div className="side-nav-item">
                <span className="side-nav-icon" aria-hidden="true" />
                <span className="side-nav-label">Agenda</span>
              </div>
              <div className="side-nav-item">
                <span className="side-nav-icon" aria-hidden="true" />
                <span className="side-nav-label">Clienti</span>
              </div>
              <div className="side-nav-item">
                <span className="side-nav-icon" aria-hidden="true" />
                <span className="side-nav-label">Automazioni</span>
              </div>
              <div className="side-nav-item">
                <span className="side-nav-icon" aria-hidden="true" />
                <span className="side-nav-label">AI Concierge</span>
              </div>
            </div>
          </div>
          <div className="side-bottom">
            <div className="side-nav-item">
              <span className="side-nav-icon" aria-hidden="true" />
              <span className="side-nav-label">Setup</span>
            </div>
          </div>
        </aside>

        <div className="preview-main">
          <div className="preview-head">
            <div>
              <h3>
                <span className="gradient">Dashboard</span>
                <br />
                del salone
              </h3>
            </div>
            <div className="mini-actions">
              <div className="mini-btn">Nuovo cliente</div>
              <div className="mini-btn primary">Nuovo appuntamento</div>
            </div>
          </div>

          <div className="metrics">
            <div className="metric">
              <div className="label">Agenda oggi</div>
              <div className="value">18</div>
              <div className="sub">2 slot liberi</div>
            </div>
            <div className="metric">
              <div className="label">Clienti oggi</div>
              <div className="value">15</div>
              <div className="sub">3 nuovi</div>
            </div>
            <div className="metric">
              <div className="label">No-show previsti</div>
              <div className="value">1</div>
              <div className="sub">reminder inviati</div>
            </div>
            <div className="metric kpi">
              <div className="label">Incasso stimato</div>
              <div className="value">€1860</div>
              <div className="sub">oggi</div>
            </div>
          </div>

          <div className="preview-body">
            <div className="glass-panel">
              <div className="panel-title">Agenda multi-operatore</div>
              <div className="calendar-wrap">
                <div className="lane">
                  <div className="event a">
                    Chiara Neri
                    <em>09:30 · Balayage</em>
                  </div>
                  <div className="event b">
                    Sara Bianchi
                    <em>13:00 · Colore</em>
                  </div>
                </div>
                <div className="lane">
                  <div className="event b">
                    Martina Villa
                    <em>10:15 · Piega</em>
                  </div>
                  <div className="event a" style={{ top: 108, height: 94 }}>
                    Laura Rossi
                    <em>12:30 · Taglio</em>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel">
              <div className="panel-title">Assistente AI</div>
              <div className="ai-list">
                <div className="ai-item">
                  <strong>Slot libero 15:00</strong>
                  <span>3 clienti compatibili con promo piega</span>
                </div>
                <div className="ai-item">
                  <strong>Cliente dormiente</strong>
                  <span>Martina non torna da 90 giorni</span>
                </div>
                <div className="ai-item">
                  <strong>Upsell suggerito</strong>
                  <span>Chiara potrebbe aggiungere trattamento gloss</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

