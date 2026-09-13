# Drawing for Executives

A senior manager reads a diagram for about thirty seconds and takes away one thing. Design
for that, not for completeness.

## Rules

1. **One diagram, one question.** Write the question down before drawing: "who depends on
   us?", "where does an order go?", "what breaks if SAP is down?" If two questions need
   answering, that is two diagrams.
2. **Twelve nodes maximum.** The validator enforces this for `audience: exec`. Over the cap,
   split by C4 level (context, then container) or by flow (ordering, then payment).
3. **Name things in business language.** "Payment Providers", not `payment-engine-svc`.
   Put the technical name in the `sublabel` where it does not compete for attention.
4. **Expand every acronym on first use.** CDC, HPA, and SSR mean nothing outside the team.
5. **Say what is out of scope** in the `scope` line. A reader who cannot see the edges of a
   diagram assumes it shows everything.
6. **Cut anything that does not change a decision.** Retry counts, sidecars, and internal
   queues belong in the container view, not the context view.
7. **Date it.** An undated diagram is quoted as current for years.

## Choosing the level

| The question | The diagram |
|---|---|
| Who uses this and what does it depend on? | Context |
| What are the moving parts and what do they run on? | Container |
| Where does it run, in which region, behind what? | Deployment |
| How does an order actually travel? | Data flow or sequence |
| What states can this thing be in? | State |

## Reviewing your own diagram

Ask someone outside the team to read it and say what it means. If they ask what a shape is,
the legend failed. If they ask which part matters, the diagram answers more than one
question. If they ask when it was true, the title block failed.

Sources: C4 model guidance, plus published practice from Wittij, InfraSketch, Niteco, and
vFunction on scoping, notation, and removing what does not clarify.
