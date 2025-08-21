import { ReportHandler } from 'web-vitals';

const reportWebVitals = async (onPerfEntry?: any) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    const webVitals = await import('web-vitals');
    const { getCLS, getFID, getFCP, getLCP, getTTFB } = webVitals;
    getCLS(onPerfEntry);
    getFID(onPerfEntry);
    getFCP(onPerfEntry);
    getLCP(onPerfEntry);
    getTTFB(onPerfEntry);
  }
};

export default reportWebVitals;
