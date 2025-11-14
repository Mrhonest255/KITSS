import React from 'react';

interface ShareIconProps {
    className?: string;
}

export const ShareIcon: React.FC<ShareIconProps> = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={className}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25a3 3 0 100 6 3 3 0 000-6zm9-4.5a3 3 0 100 6 3 3 0 000-6zm0 10.5a3 3 0 100 6 3 3 0 000-6z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.743 9.743l4.514-2.514M9.743 14.257l4.514 2.514" />
    </svg>
);

export default ShareIcon;
