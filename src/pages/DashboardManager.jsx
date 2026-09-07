diff --git a/src/pages/DashboardManager.jsx b/src/pages/DashboardManager.jsx
index ca9c420..4a11c91 100644
--- a/src/pages/DashboardManager.jsx
+++ b/src/pages/DashboardManager.jsx
@@ -105,6 +105,53 @@ const KpiCardDetail = ({ label, value, color, bg, previous, type, semaine, annee
   )
 }
 
+const P1KpiCard = ({ value, previous, data, recurringIds }) => {
+  const [open, setOpen] = useState(false)
+  const color = '#6D28D9', bg = '#EDE9FE'
+  return (
+    <div>
+      <div onClick={() => value > 0 && setOpen(o => !o)}
+        style={{ background: bg, borderRadius: open ? '10px 10px 0 0' : 10, padding: '10px 12px', cursor: value > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
+        <div style={{ flex: 1 }}>
+          <div style={{ fontSize: 10, color, fontWeight: 600, opacity: 0.75, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.3px' }}>🎯 P1 actifs</div>
+          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
+            <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
+            <div style={{ paddingBottom: 2 }}><Trend current={value} previous={previous} /></div>
+          </div>
+          {previous !== undefined && <div style={{ fontSize: 10, color, opacity: 0.55, marginTop: 3 }}>Préc. : {previous}</div>}
+        </div>
+        {value > 0 && <span style={{ fontSize: 12, color, fontWeight: 700, marginLeft: 6 }}>{open ? '▲' : '▼'}</span>}
+      </div>
+      {open && (
+        <div style={{ background: 'rgba(255,255,255,0.9)', border: `1.5px solid ${color}20`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 10 }}>
+          {data.length === 0 ? (
+            <div style={{ textAlign: 'center', fontSize: 12, color, opacity: 0.6, padding: '6px 0', fontStyle: 'italic' }}>Aucun P1 renseigné</div>
+          ) : data.map(p => (
+            <div key={p.id} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', marginBottom: 6, border: '1.5px solid #C4B5FD' }}>
+              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
+                <div style={{ fontSize: 12, fontWeight: 700, color: '#4C1D95' }}>{p.profil || p.description}</div>
+                {recurringIds?.has(p.id) && <span style={{ fontSize: 9, fontWeight: 700, color: '#92400E', background: '#FEF3C7', borderRadius: 5, padding: '1px 6px', flexShrink: 0 }}>🔁 récurrent</span>}
+              </div>
+              {p.client && <div style={{ fontSize: 11, color: '#6D28D9', marginTop: 2 }}>🏢 {p.client}</div>}
+              {p.ia?.nom && <div style={{ fontSize: 10, color: '#7C3AED', opacity: 0.7, marginTop: 2 }}>👤 {p.ia.nom}</div>}
+            </div>
+          ))}
+        </div>
+      )}
+    </div>
+  )
+}
+
+// Renvoie l'ensemble des ids de P1 (semaine courante) déjà déclarés à l'identique la semaine précédente
+// → signale les priorités qui ont de bonnes chances de rester des priorités dans les semaines à venir
+const matchKeyP1 = p => (p.profil || p.description || '').trim().toLowerCase() + '|' + (p.client || '').trim().toLowerCase()
+const getRecurringP1Ids = (currentList, previousList) =>
+  new Set(
+    currentList
+      .filter(p => previousList.some(prev => prev.ia_id === p.ia_id && matchKeyP1(prev) === matchKeyP1(p)))
+      .map(p => p.id)
+  )
+
 const SectionTitle = ({ title, color, icon }) => (
   <div style={{ fontSize: 13, fontWeight: 700, color, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 16 }}>
     <span>{icon}</span>{title}
@@ -156,6 +203,13 @@ function PanneauCommerce({ saisies, iaList, p1Data, selectedWeek, setSelectedWee
   })
 
   const validP1 = p1Data.filter(p => p.semaine === selectedWeek && isValidP1(p))
+  const prevValidP1 = p1Data.filter(p => p.semaine === selectedWeek - 1 && isValidP1(p))
+  const recurringP1Ids = getRecurringP1Ids(validP1, prevValidP1)
+  const p1Trend = Array.from({ length: 6 }, (_, i) => {
+    const w = selectedWeek - 5 + i
+    return { name: 'S' + w, P1: p1Data.filter(p => p.semaine === w && isValidP1(p)).length }
+  })
+  const p1TrendMax = Math.max(1, ...p1Trend.map(t => t.P1))
 
   const ranking = [...weekData]
     .filter(d => d.ia?.nom && !d.ia.nom.toLowerCase().includes('p1'))
@@ -197,6 +251,7 @@ function PanneauCommerce({ saisies, iaList, p1Data, selectedWeek, setSelectedWee
             <KpiCardDetail label="Signatures" value={sum(weekData, 'signatures')} color="#9D174D" bg="#FCE7F3" previous={p('signatures')} type="signature" semaine={selectedWeek} annee={annee} key={`s-${selectedWeek}-${refreshKey}`} />
             <KpiCardDetail label="Démarrages" value={sum(weekData, 'demarrages')} color="#065F46" bg="#D1FAE5" previous={p('demarrages')} type="demarrage" semaine={selectedWeek} annee={annee} key={`d-${selectedWeek}-${refreshKey}`} />
             <KpiCardDetail label="Fins mission" value={sum(weekData, 'fins_de_mission')} color="#92400E" bg="#FEF3C7" previous={p('fins_de_mission')} type="fin_mission" semaine={selectedWeek} annee={annee} key={`f-${selectedWeek}-${refreshKey}`} />
+            <P1KpiCard value={validP1.length} previous={selectedWeek > 1 ? prevValidP1.length : undefined} data={validP1} recurringIds={recurringP1Ids} key={`p1kpi-${selectedWeek}`} />
           </div>
 
           <SectionTitle title="Tendance 6 semaines" color="#1E40AF" icon="📈" />
@@ -216,29 +271,38 @@ function PanneauCommerce({ saisies, iaList, p1Data, selectedWeek, setSelectedWee
           <SectionTitle title={`Classement S${selectedWeek}`} color="#9D174D" icon="🏆" />
           <Podium ranking={ranking} accentColor="#BE185D" bgGradient="linear-gradient(180deg,#FFF1F2,#FCE7F3)" borderColor="#FECDD3" />
 
-          {validP1.length > 0 && (
-            <>
-              <SectionTitle title={`P1 actifs S${selectedWeek}`} color="#6D28D9" icon="🎯" />
-              <div style={{ background: '#EDE9FE', borderRadius: 12, padding: 12, marginBottom: 16 }}>
-                {validP1.map(p => (
-                  <div key={p.id} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', marginBottom: 6, border: '1.5px solid #C4B5FD' }}>
-                    <div style={{ fontSize: 12, fontWeight: 700, color: '#4C1D95' }}>{p.profil || p.description}</div>
-                    {p.client && <div style={{ fontSize: 11, color: '#6D28D9', marginTop: 2 }}>🏢 {p.client}</div>}
-                    {p.ia?.nom && <div style={{ fontSize: 10, color: '#7C3AED', opacity: 0.7, marginTop: 2 }}>👤 {p.ia.nom}</div>}
-                  </div>
-                ))}
+          <SectionTitle title={`P1 actifs S${selectedWeek}`} color="#6D28D9" icon="🎯" />
+          <div style={{ background: '#EDE9FE', borderRadius: 12, padding: 12, marginBottom: 16 }}>
+            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 40, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #C4B5FD' }}>
+              {p1Trend.map(t => (
+                <div key={t.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }} title={`${t.P1} P1 déclaré(s)`}>
+                  <div style={{ width: '100%', maxWidth: 18, height: Math.max(3, Math.round((t.P1 / p1TrendMax) * 28)), background: t.name === 'S' + selectedWeek ? '#6D28D9' : '#C4B5FD', borderRadius: 3 }} />
+                  <div style={{ fontSize: 8, color: '#6D28D9', opacity: 0.7 }}>{t.name}</div>
+                </div>
+              ))}
+            </div>
+            {validP1.length === 0 ? (
+              <div style={{ textAlign: 'center', fontSize: 12, color: '#6D28D9', opacity: 0.6, padding: '10px 0', fontStyle: 'italic' }}>Aucun P1 déclaré cette semaine</div>
+            ) : validP1.map(p => (
+              <div key={p.id} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', marginBottom: 6, border: '1.5px solid #C4B5FD' }}>
+                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
+                  <div style={{ fontSize: 12, fontWeight: 700, color: '#4C1D95' }}>{p.profil || p.description}</div>
+                  {recurringP1Ids.has(p.id) && <span style={{ fontSize: 9, fontWeight: 700, color: '#92400E', background: '#FEF3C7', borderRadius: 5, padding: '1px 6px', flexShrink: 0 }}>🔁 récurrent</span>}
+                </div>
+                {p.client && <div style={{ fontSize: 11, color: '#6D28D9', marginTop: 2 }}>🏢 {p.client}</div>}
+                {p.ia?.nom && <div style={{ fontSize: 10, color: '#7C3AED', opacity: 0.7, marginTop: 2 }}>👤 {p.ia.nom}</div>}
               </div>
-            </>
-          )}
+            ))}
+          </div>
         </>
       ) : (
-        <FocusIAMini saisies={saisies} iaList={iaList} selectedWeek={selectedWeek} semaine={semaine} annee={annee} refreshKey={refreshKey} />
+        <FocusIAMini saisies={saisies} iaList={iaList} p1Data={p1Data} selectedWeek={selectedWeek} semaine={semaine} annee={annee} refreshKey={refreshKey} />
       )}
     </div>
   )
 }
 
-function FocusIAMini({ saisies, iaList, selectedWeek, semaine, annee, refreshKey }) {
+function FocusIAMini({ saisies, iaList, p1Data, selectedWeek, semaine, annee, refreshKey }) {
   const [selectedIa, setSelectedIa] = useState(null)
   const [iaIndex, setIaIndex] = useState(0)
   const [viewMode, setViewMode] = useState('semaine')
@@ -254,6 +318,10 @@ function FocusIAMini({ saisies, iaList, selectedWeek, semaine, annee, refreshKey
   }) : []
   const p = key => selectedWeek > 1 ? sum(iaPrev, key) : undefined
 
+  const iaValidP1 = selectedIa ? p1Data.filter(x => x.ia_id === selectedIa.id && x.semaine === selectedWeek && isValidP1(x)) : []
+  const iaPrevValidP1 = selectedIa ? p1Data.filter(x => x.ia_id === selectedIa.id && x.semaine === selectedWeek - 1 && isValidP1(x)) : []
+  const iaRecurringP1Ids = getRecurringP1Ids(iaValidP1, iaPrevValidP1)
+
   if (!selectedIa) return (
     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
       {iaList.map((ia, i) => {
@@ -305,7 +373,24 @@ function FocusIAMini({ saisies, iaList, selectedWeek, semaine, annee, refreshKey
               previous={selectedWeek > 1 ? sum(iaPrev, 'besoins_sans_solution') + sum(iaPrev, 'attente_retour') + sum(iaPrev, 'attente_retour_prez') : undefined} />
             <KpiCardDetail label="Présentations" value={sum(iaData, 'presentations')} color="#1E40AF" bg="#DBEAFE" previous={p('presentations')} type="presentation" semaine={selectedWeek} annee={annee} iaId={selectedIa.id} key={`fp-${selectedWeek}-${selectedIa.id}-${refreshKey}`} />
             <KpiCardDetail label="Signatures" value={sum(iaData, 'signatures')} color="#9D174D" bg="#FCE7F3" previous={p('signatures')} type="signature" semaine={selectedWeek} annee={annee} iaId={selectedIa.id} key={`fs-${selectedWeek}-${selectedIa.id}-${refreshKey}`} />
+            <P1KpiCard value={iaValidP1.length} previous={selectedWeek > 1 ? iaPrevValidP1.length : undefined} data={iaValidP1} recurringIds={iaRecurringP1Ids} key={`fp1kpi-${selectedWeek}-${selectedIa.id}`} />
           </div>
+          {iaValidP1.length > 0 && (
+            <div style={{ marginBottom: 14 }}>
+              <SectionTitle title={`P1 actifs — ${selectedIa.nom}`} color="#6D28D9" icon="🎯" />
+              <div style={{ background: '#EDE9FE', borderRadius: 12, padding: 12 }}>
+                {iaValidP1.map(pr => (
+                  <div key={pr.id} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', marginBottom: 6, border: '1.5px solid #C4B5FD' }}>
+                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
+                      <div style={{ fontSize: 12, fontWeight: 700, color: '#4C1D95' }}>{pr.profil || pr.description}</div>
+                      {iaRecurringP1Ids.has(pr.id) && <span style={{ fontSize: 9, fontWeight: 700, color: '#92400E', background: '#FEF3C7', borderRadius: 5, padding: '1px 6px', flexShrink: 0 }}>🔁 récurrent</span>}
+                    </div>
+                    {pr.client && <div style={{ fontSize: 11, color: '#6D28D9', marginTop: 2 }}>🏢 {pr.client}</div>}
+                  </div>
+                ))}
+              </div>
+            </div>
+          )}
           <SectionTitle title="Évolution" color="#1E40AF" icon="📈" />
           <div style={{ background: '#DBEAFE', borderRadius: 12, padding: 12, marginBottom: 14 }}>
             <ResponsiveContainer width="100%" height={110}>
