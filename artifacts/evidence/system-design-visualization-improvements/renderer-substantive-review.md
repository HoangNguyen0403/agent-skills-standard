# Independent renderer review — corrections required

Reviewer: 4811d741-1477-45a7-85e2-56b9a967f10f. Base52671cf9ed6a1c376dfaaae7e621dbc51a4c8765; preliminary immutable review2f46fd6f8c38-99ad93761cc2 plus recovered production source. These are omissions against approved SRS002/003, not new product scope or a new general router. Parent16Desktop exports pass basic fixtures but do not prove adverse text bounds.

1. MAJOR edge footprint: checker assumes20charwrap/capswidth but emitted labels lack matching geometry. Node intersection only center not fullrect; evidence predicate suppresses warning on anycitation though renderer requires supported kind/confidence. Derive a shared label plan including literal text, exactwrap/width/height/evidence predicate, emitted cell/label geometry; check fullrectangle-node and unrelated-route-label intersections. Honest strict findings where no placement fits.
2. MAJOR sequence: participant footprint can expand but lifelines/catalogheight and firstmessage BODY_Y+CELL_H+80/fixed60spacing ignore expansion. Plan firstmessage/lifelines below actual participant text and rowspacing from complete message labels; sequence-specific strict checks rather than unconditional skip.
3. MAJOR ERD: fixedheader30/row22/overflowhidden clips longcolumn/type/header provenance. Plan complete header/column text, matching totalheight/childrowoffsets; preserve meaning or honest actionable finding.
4. MAJOR title/view/group: title30/meta18/view66 and bodyfixed/groupheaderpadding46 ignore longscope/multiline7fields/boundarylabels. Include exact header/group rectangles in Layout, derive body/group offsets, strict intersections.
5. MAJOR supported AWS dark: original AWSstyle font#232F3E belowicon on#111827 darkbackground fails textcontrast; unverifiedfixtures hide it. Change label text independently of brandart; supported/documented actual AWS export + contrast proof.

Parent actual dataflow-light.png also shows GCPComposer/Landing icons almostwhite versus bluelegend, BigQuery orange dashedstencil. Assess unverified style overlay; do not recolor brandart to show uncertainty. Preserve label/badge/border indication separate from original artwork.

Positive source review: literal escaping applied node/edge/title/view/group/ERD; palette helpers do not mutate sharedcatalog; custom evidenceproperties preserved. Current semantic test onlyIDs/values, not source/target/objectmetadata/cardinality. Parent fuller semantic/input checks separate; strengthen relevant behavior comparisons, never source-textpinning.

Required closure: source corrections + meaningful adverse longtext/header/group/sequence/ERD and supportedevidence tests, real export smoke, independent cumulative finalreview. No live model/humanreader/wholefeature acceptance inferred. Reviewer ran no tests/commands.
