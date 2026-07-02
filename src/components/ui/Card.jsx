// Surface for grouped content. Only `interactive` cards glow on hover — a
// glow on a static panel suggests it's clickable when it isn't.
export function Card({
  as: Tag = 'div',
  interactive = false,
  padding = 'md', // none | sm | md
  className = '',
  children,
  ...rest
}) {
  const cls = ['card', !interactive && 'card-static', `card-pad-${padding}`, className]
    .filter(Boolean).join(' ')
  return <Tag className={cls} {...rest}>{children}</Tag>
}
