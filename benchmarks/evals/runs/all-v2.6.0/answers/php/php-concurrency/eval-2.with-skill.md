Use ReactPHP or Amp for non-blocking I/O and run the event loop at the application entry point. Use async-compatible clients; do not call blocking file_get_contents or sleep inside a Fiber or event loop. Propagate errors through the library's promise or future mechanism.

