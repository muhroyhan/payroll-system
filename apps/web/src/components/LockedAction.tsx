import { Button, Tooltip, type ButtonProps } from 'antd';

interface LockedActionProps extends ButtonProps {
  /** True when a §11 rule (or the current state machine) blocks this action. */
  locked: boolean;
  /** Required whenever `locked` is true — the whole point of R-06 is that the
   *  user reads *why* before clicking, not after a 409. */
  reason?: string;
}

// R-06 (07_FRONTEND_RULES.md) — every action a §11 lock can block renders
// disabled with a tooltip explaining why, BEFORE the click, not discovered
// via a 409 afterward. Wrap the button in a <span> because a disabled
// native control doesn't fire the mouse events antd's Tooltip needs to
// trigger — this is antd's own documented workaround, not a hack.
export function LockedAction({ locked, reason, disabled, ...buttonProps }: LockedActionProps) {
  const button = <Button {...buttonProps} disabled={disabled || locked} />;

  if (locked && reason) {
    return (
      <Tooltip title={reason}>
        <span>{button}</span>
      </Tooltip>
    );
  }

  return button;
}
