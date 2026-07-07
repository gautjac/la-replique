import { forwardRef, useEffect, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

/** A textarea that grows to fit its content (JS fallback for field-sizing). */
export const AutoTextarea = forwardRef<HTMLTextAreaElement, Props>(function AutoTextarea(props, ref) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const resize = () => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  useLayoutEffect(resize);
  useEffect(() => {
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <textarea
      {...props}
      rows={1}
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }}
      onInput={(e) => {
        resize();
        props.onInput?.(e);
      }}
      className={"grow-input " + (props.className ?? "")}
    />
  );
});
