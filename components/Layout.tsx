
import React from 'react';

interface LayoutProps {
    children: {
        left: React.ReactNode;
        right: React.ReactNode;
    };
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <main className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-8 lg:grid-cols-[1.05fr_0.95fr] xl:gap-12">
            <div className="w-full">{children.left}</div>
            <div className="w-full">{children.right}</div>
        </main>
    );
};

export default Layout;
