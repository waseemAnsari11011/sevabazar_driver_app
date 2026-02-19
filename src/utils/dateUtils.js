export const getDateRange = (filter, customStart, customEnd) => {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();

    // Set time to end of day for endDate
    endDate.setHours(23, 59, 59, 999);

    switch (filter) {
        case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'yesterday':
            startDate.setDate(today.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setDate(today.getDate() - 1);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'week':
            // Last 7 days
            startDate.setDate(today.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'month':
            // Start of current month
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'custom':
            if (customStart && customEnd) {
                startDate = new Date(customStart);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(customEnd);
                endDate.setHours(23, 59, 59, 999);
            }
            break;
        default:
            startDate.setHours(0, 0, 0, 0);
    }

    return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
    };
};
