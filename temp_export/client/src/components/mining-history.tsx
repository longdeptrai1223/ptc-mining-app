import { useMining } from "@/hooks/use-mining";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { format } from "date-fns";

export default function MiningHistory() {
  const { miningHistory, fetchMiningHistory } = useMining();

  return (
    <Card className="mt-8 bg-white rounded-xl shadow overflow-hidden">
      <CardHeader className="p-6 bg-gradient-to-r from-gray-700 to-gray-800">
        <h2 className="text-xl font-bold text-white mb-1">Mining History</h2>
        <p className="text-gray-300">Track your mining performance over time</p>
      </CardHeader>
      
      <CardContent className="p-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-gray-50">Date</TableHead>
                  <TableHead className="bg-gray-50">Amount</TableHead>
                  <TableHead className="bg-gray-50">Multiplier</TableHead>
                  <TableHead className="bg-gray-50">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {miningHistory.length > 0 ? (
                  miningHistory.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap text-sm text-gray-900">
                        {format(item.date, "MMM d, yyyy - HH:mm")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-gray-900">
                        {item.amount.toFixed(2)} PTC
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-gray-900">
                        {item.multiplier.toFixed(1)}x
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          item.status === "completed" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {item.status === "completed" ? "Completed" : "Cancelled"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                      No mining history yet. Start mining to see your activity here!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
