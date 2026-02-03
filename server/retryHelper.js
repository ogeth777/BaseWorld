// Helper to wait for transaction receipt with retries
async function getTransactionReceiptWithRetry(hash, retries = 5, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            const receipt = await client.getTransactionReceipt({ hash });
            return receipt;
        } catch (error) {
            // If error is not "found", rethrow. 
            // Viem throws TransactionReceiptNotFoundError if not found.
            // But we should check if it's that error or network error.
            console.log(`Attempt ${i + 1} failed for ${hash}: ${error.message}`);
            if (i === retries - 1) throw error;
            await new Promise(r => setTimeout(r, delay));
        }
    }
}
