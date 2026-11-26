---
name: fixture-oversized-block
description: Inert oversized-block artifact fixture for PR349 offline verification. Use when testing fenced block limits.
---
# Fixture Oversized Block

## Rule

- Extract long samples instead of embedding them in the body.

## Example

   ~~~text
   Line 01.
   Line 02.
   Line 03.
   Line 04.
   Line 05.
   Line 06.
   Line 07.
   Line 08.
   Line 09.
   Line 10.
   Line 11.
   Line 12.
   Line 13.
   Line 14.
   ~~~~

## Checklist

- [ ] Extract the block to `references/`.
