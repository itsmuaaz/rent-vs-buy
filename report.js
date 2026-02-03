// Snapshot Report Generation using html2canvas + jsPDF
// Captures the exact state of the webpage as a long scrolling PDF.

async function generatePDF(data) {
    const { jsPDF } = window.jspdf;
    
    // 1. Prepare UI for Snapshot
    // We want to expand the scrollable areas to capture full content.
    const originalBodyStyle = document.body.getAttribute('style');
    const originalHTMLStyle = document.documentElement.getAttribute('style');
    // Use attribute selector for Tailwind classes with colons to avoid JS escaping hell
    const scrollContainers = document.querySelectorAll('.overflow-auto, [class~="md:overflow-hidden"], [class~="md:h-screen"]');
    const originalStyles = [];

    // Force expansion
    document.documentElement.style.height = 'auto';
    document.documentElement.style.overflow = 'visible';
    document.body.style.height = 'auto';
    document.body.style.overflow = 'visible';
    
    // Hide UI controls that shouldn't be in the report
    const noPrint = document.querySelectorAll('.no-print');
    noPrint.forEach(el => el.style.display = 'none');

    // Expand internal scroll containers (like Main and Sidebar)
    scrollContainers.forEach(el => {
        originalStyles.push({ el, style: el.getAttribute('style'), class: el.className });
        el.style.height = 'auto';
        el.style.overflow = 'visible';
        // Disable fixed positioning if any (like sticky headers, though header is static in flow)
    });
    
    // Wait for layout repaint
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        // 2. Capture Canvas
        const canvas = await html2canvas(document.body, {
            scale: 2, // Retina quality
            useCORS: true, // For external images if any
            logging: false,
            windowWidth: document.documentElement.scrollWidth,
            windowHeight: document.documentElement.scrollHeight
        });

        // 3. Generate PDF
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        // PDF Dimensions (Match the canvas aspect ratio)
        // We create a single long page PDF.
        // Convert px to mm (1px = 0.264583 mm)
        const pxToMm = 0.264583;
        const pdfWidth = imgWidth * pxToMm;
        const pdfHeight = imgHeight * pxToMm;

        const pdf = new jsPDF({
            orientation: pdfWidth > pdfHeight ? 'l' : 'p',
            unit: 'mm',
            format: [pdfWidth, pdfHeight]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Property_Strategy_Snapshot_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (err) {
        console.error("PDF Generation Error:", err);
        alert("Failed to generate report. Please try again.");
    } finally {
        // 4. Cleanup / Restore UI
        document.documentElement.setAttribute('style', originalHTMLStyle || '');
        document.body.setAttribute('style', originalBodyStyle || '');
        
        noPrint.forEach(el => el.style.display = '');
        
        scrollContainers.forEach((item, i) => {
            if (originalStyles[i].style) {
                item.el.setAttribute('style', originalStyles[i].style);
            } else {
                item.el.removeAttribute('style');
            }
        });
        
        // Force refresh layout
        window.dispatchEvent(new Event('resize'));
    }
}