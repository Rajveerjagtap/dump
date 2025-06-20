import React from 'react';

const StudentDashboardSimple: React.FC = () => {
    console.log('StudentDashboardSimple component rendered');

    return (
        <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
            <h1 style={{ color: 'black', fontSize: '24px', marginBottom: '16px' }}>Student Dashboard - Test</h1>
            <p style={{ color: '#666', marginBottom: '16px' }}>This is a simple test to verify the component is working</p>
            <div style={{ padding: '16px', backgroundColor: '#e0f2fe', borderRadius: '8px' }}>
                <p style={{ color: 'black' }}>If you can see this, the component is rendering correctly!</p>
            </div>
        </div>
    );
};

export default StudentDashboardSimple;
