ARC releases class instances when their strong-reference count reaches zero. A retain cycle occurs when objects or closures strongly retain one another, keeping both alive.

Break cycles by designing ownership clearly: use `weak` for non-owning relationships that may disappear, such as delegates; use weak capture lists for escaping closures that must not keep an owner alive; and avoid unnecessary back-references. For parent-child models, make the parent own children strongly and the child reference its parent weakly. Verify suspected cycles with Xcode's Memory Graph and Instruments rather than adding `weak` everywhere.

