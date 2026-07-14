Escape user-controlled text at the output context:

~~~php
$safeName = htmlentities(
    $userName,
    ENT_QUOTES | ENT_HTML5,
    'UTF-8',
);
echo $safeName;
~~~

Prefer Twig or Blade auto-escaping, use context-appropriate encoding, and never trust raw request values.

