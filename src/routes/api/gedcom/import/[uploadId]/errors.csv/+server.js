/**
 * GEDCOM Error Log CSV Download Endpoint
 * Story #97: GEDCOM Import Error Handling and Recovery
 *
 * GET /api/gedcom/import/:uploadId/errors.csv
 * Downloads error log as CSV file
 */

import { getPreviewData } from '$lib/server/gedcomPreview.js'
import { generateErrorLogCSV } from '$lib/server/gedcomErrorHandler.js'

/**
 * GET /api/gedcom/import/:uploadId/errors.csv
 * Downloads error log as CSV file
 *
 * @param {Object} params - Route parameters
 * @returns {Response} CSV file download
 */
export async function GET({ params }) {
  try {
    const { uploadId } = params

    // Get preview data (which includes errors)
    const previewData = await getPreviewData(uploadId)

    if (!previewData) {
      return new Response('Preview data not found', { status: 404 })
    }

    const errors = previewData.errors || []

    // Generate CSV content
    const csvContent = generateErrorLogCSV(errors)

    // Generate filename with timestamp
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`
    const filename = `import_errors_${timestamp}.csv`

    // Return CSV as downloadable file
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('Error generating error log CSV:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
