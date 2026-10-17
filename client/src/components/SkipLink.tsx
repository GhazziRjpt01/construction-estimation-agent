export function SkipLink() {
  return (
    <a
      className="skip-link"
      href="#content"
      onFocus={(event) => event.currentTarget.classList.add("is-focused")}
      onBlur={(event) => event.currentTarget.classList.remove("is-focused")}
    >
      Skip to content
    </a>
  )
}
