/**
 * PulseIndicator - Visual indicator for active timer/work in progress
 * Shows a pulsing purple dot when a user is actively working on a task
 */

import clsx from 'clsx';

interface PulseIndicatorProps {
    /** Whether the pulse animation is active */
    isActive: boolean;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Custom className */
    className?: string;
}

const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3'
};

export const PulseIndicator = ({
    isActive,
    size = 'sm',
    className
}: PulseIndicatorProps) => {
    if (!isActive) return null;

    return (
        <span className={clsx(
            "relative inline-flex",
            className
        )}>
            {/* Outer pulsing ring */}
            <span className={clsx(
                "animate-ping absolute inline-flex rounded-full bg-purple-400 opacity-75",
                sizeClasses[size]
            )} />
            {/* Solid dot */}
            <span className={clsx(
                "relative inline-flex rounded-full bg-purple-500",
                sizeClasses[size]
            )} />
        </span>
    );
};

export default PulseIndicator;
