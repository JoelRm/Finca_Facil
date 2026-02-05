export default function AccountsTable({ accounts }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow my-4">
      <h3 className="text-gray-500 mb-2">Saldos</h3>
      <div className="space-y-2">
        {accounts.map(acc => (
          <div key={acc.bank} className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <img src={acc.logo} className="h-6 w-6" alt={acc.bank} />
              <span>{acc.bank}</span>
            </div>
            <span className="font-semibold">{acc.balance}€</span>
          </div>
        ))}
      </div>
    </div>
  );
}
