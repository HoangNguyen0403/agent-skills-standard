Keep `'use client'` out of the page/layout and place it at the smallest leaf that needs hooks or browser events. A page can fetch data as an async Server Component and pass serializable props to an interactive button, form, or chart Client Component. Do not move the whole tree to the client just to make one leaf interactive.

