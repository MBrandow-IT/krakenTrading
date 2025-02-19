import { executeQueryWithRetry } from './sqlconnection';

export async function insertTableRecords(tableName: string, records: any[]) {
  try {
    const recordCount = records.length;

    for (const record of records) {
      // Clean and validate numeric values
      const cleanedRecord = Object.fromEntries(
        Object.entries(record).map(([key, value]) => {
          // Handle null/undefined
          if (value === null || value === undefined) {
            return [key, null];
          }
          // Convert numeric strings and handle NaN/Infinity
          if (typeof value === 'number' || !isNaN(Number(value))) {
            const num = Number(value);
            if (isNaN(num) || !isFinite(num)) {
              return [key, null];
            }
            // Ensure the number has reasonable precision
            return [key, Number(num.toFixed(8))];
          }
          // Keep non-numeric values as-is
          return [key, value];
        })
      );

      const columns = Object.keys(cleanedRecord);
      const paramPlaceholders = columns.map((_, index) => `@param${index}`).join(', ');

      const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${paramPlaceholders})`;

      try {
        await executeQueryWithRetry({
          text: query,
          values: Object.values(cleanedRecord),
        });
      } catch (err) {
        console.error('Failed to insert record:', cleanedRecord);
        console.error('Error:', err);
        throw err;
      }
    }

    return { message: `${recordCount} records inserted successfully` };
  } catch (error) {
    throw new Error(`Error inserting records: ${error}`);
  }
}

export async function updateTableRecords(tableName: string, records: any[]) {
  try {
    if (!Array.isArray(records)) {
      throw new Error('Records must be an array');
    }

    let updatedCount = 0;

    for (const record of records) {
      if (!record.ID) continue;

      const columns = Object.keys(record).filter((key) => key !== 'ID');
      const setStatements = columns.map((col, index) => `${col} = @param${index}`).join(', ');

      const query = `UPDATE ${tableName} SET ${setStatements} WHERE ID = @param${columns.length}`;
      const values = [...columns.map((col) => record[col]), record.ID];

      const updateResult = await executeQueryWithRetry({
        text: query,
        values: values,
      });

      if (updateResult.rowsAffected?.[0] > 0) {
        updatedCount++;
      }
    }

    return { message: `${updatedCount} of ${records.length} records updated successfully` };
  } catch (error) {
    throw new Error(`Error updating records: ${error}`);
  }
}
