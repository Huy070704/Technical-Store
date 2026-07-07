import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Xuất một trang HTML hoàn chỉnh ra file PDF (A4).
 *
 * HTML được render trong một iframe biệt lập nên CSS toàn cục (Tailwind…) của
 * ứng dụng KHÔNG ảnh hưởng — chỉ style nội bộ trong chuỗi HTML được áp dụng.
 * Nhờ đó bản in giữ đúng bố cục và hiển thị tiếng Việt chuẩn (html2canvas chụp
 * ảnh thật của DOM thay vì dựng chữ bằng font mặc định của jsPDF).
 *
 * @param fullHtml Chuỗi HTML dạng `<html>…<style>…</style><body>…</body></html>`
 * @param filename Tên file .pdf khi tải về
 */
export async function exportHtmlStringToPdf(fullHtml: string, filename: string): Promise<void> {
  const A4_WIDTH_PX = 794; // ~ 210mm ở 96dpi

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = `${A4_WIDTH_PX}px`;
  iframe.style.height = '1123px';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentWindow?.document;
    if (!doc) throw new Error('Không khởi tạo được vùng in.');

    doc.open();
    doc.write(fullHtml);
    doc.close();

    // Chờ layout + font sẵn sàng trước khi chụp
    await new Promise((resolve) => setTimeout(resolve, 250));
    try {
      await (doc as Document & { fonts?: FontFaceSet }).fonts?.ready;
    } catch {
      /* fonts API không có — bỏ qua */
    }

    const target = doc.body;
    const canvas = await html2canvas(target, {
      scale: 2,
      backgroundColor: '#ffffff',
      windowWidth: A4_WIDTH_PX,
    });

    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgData = canvas.toDataURL('image/png');
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(iframe);
  }
}
