// The bento tile. Only `interactive` cards react on hover — a hover state on
// a static panel suggests it's clickable when it isn't. `tone` tints the tile
// with a tool colour (news | football | radio | language).
export function Card({
  as: Tag = 'div',
  interactive = false,
  padding = 'md', // none | sm | md
  tone,
  className = '',
  children,
  ...rest
}) {
  const cls = ['card', !interactive && 'card-static', `card-pad-${padding}`, tone && `card-tone-${tone}`, className]
    .filter(Boolean).join(' ')
  return <Tag className={cls} {...rest}>{children}</Tag>
}
