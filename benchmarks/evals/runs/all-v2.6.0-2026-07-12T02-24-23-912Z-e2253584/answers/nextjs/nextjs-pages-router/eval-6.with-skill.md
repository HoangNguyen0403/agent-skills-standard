`'use client'` is an App Router directive and does not create a Server/Client Component boundary in the Pages Router. Pages Router pages are already rendered with the Pages Router model: use normal React components and client hooks such as `useState`, `useEffect`, and `useRouter()` as needed. Put server data fetching in `getServerSideProps` or `getStaticProps`; do not mix in App Router patterns.

