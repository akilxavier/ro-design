// This function simulates the iterative calculation of an RO Stage
export const calculateStage = (feedFlow, feedTds, numVessels, recovery) => {
    const permeateFlow = feedFlow * (recovery / 100);
    const concentrateFlow = feedFlow - permeateFlow;
    
    // Average salt rejection (simplified at 99.5%)
    const saltRejection = 0.995;
    const permeateTds = feedTds * (1 - saltRejection);
    
    // Calculate Flux (m3/m2/h)
    // Area of standard 8040 membrane is roughly 37m2
    const totalArea = numVessels * 6 * 37; 
    const flux = permeateFlow / totalArea;

    return {
        permeateFlow,
        concentrateFlow,
        permeateTds,
        flux: flux.toFixed(2)
    };
};