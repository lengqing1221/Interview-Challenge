import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { InputSelect } from "./components/InputSelect"
import { Instructions } from "./components/Instructions"
import { Transactions } from "./components/Transactions"
import { useEmployees } from "./hooks/useEmployees"
import { usePaginatedTransactions } from "./hooks/usePaginatedTransactions"
import { useTransactionsByEmployee } from "./hooks/useTransactionsByEmployee"
import { EMPTY_EMPLOYEE } from "./utils/constants"
import { Employee, Transaction } from './utils/types';

export function App() {
  const { data: employees, ...employeeUtils } = useEmployees()
  const { data: paginatedTransactions, ...paginatedTransactionsUtils } = usePaginatedTransactions()
  const { data: transactionsByEmployee, ...transactionsByEmployeeUtils } = useTransactionsByEmployee()
  // storing the declined transactions if removed by accident
  const [declinedTransactions, setDeclinedTransactions] = useState<Transaction[]>([])

  // storing the accepted transactions into a separate array

  const [localTransactions, setLocalTransactions] = useState<Transaction[]>([])
  const [approvedTransactions, setApprovedTransactions] = useState<Transaction[]>([])


  const [isLoading, setIsLoading] = useState(false)

  const transactions = useMemo(
    () => paginatedTransactions?.data ?? transactionsByEmployee ?? null,
    [paginatedTransactions, transactionsByEmployee]
  )

  useEffect(() => {
    if (transactions) {
      setLocalTransactions(transactions)
    }
  }, [transactions])

  const handleApproveTransaction = (transactionId: string) => {
    setLocalTransactions((prev) => {
      // Find the transaction in local
      const found = prev.find((t) => t.id === transactionId)
      if (found) {
        // Add a copy to approvedTransactions
        setApprovedTransactions((oldApproved) => [
          ...oldApproved,
          { ...found, approved: true },
        ])
      }
      // Remove it from local
      return prev.filter((t) => t.id !== transactionId)
    })
  }


  // declined transactions
  const handleDeclineTransaction = (transactionId: string) => {
    setLocalTransactions((prev) => {
      const found = prev.find((t) => t.id === transactionId)
      if (found) {
        setDeclinedTransactions((oldDeclined) => [...oldDeclined, found])
      }
      // Return the new local list without the declined item
      return prev.filter((t) => t.id !== transactionId)
    })
  }


  const loadAllTransactions = useCallback(async () => {
    setIsLoading(true)
    transactionsByEmployeeUtils.invalidateData()

    await employeeUtils.fetchAll()
    await paginatedTransactionsUtils.fetchAll()

    setIsLoading(false)
  }, [employeeUtils, paginatedTransactionsUtils, transactionsByEmployeeUtils])

  const loadTransactionsByEmployee = useCallback(
    async (employeeId: string) => {
      paginatedTransactionsUtils.invalidateData()
      await transactionsByEmployeeUtils.fetchById(employeeId)
    },
    [paginatedTransactionsUtils, transactionsByEmployeeUtils]
  )

  useEffect(() => {
    if (employees === null && !employeeUtils.loading) {
      loadAllTransactions()
    }
  }, [employeeUtils.loading, employees, loadAllTransactions])

  return (
    <Fragment>
      <main className="MainContainer">
        <Instructions />

        <hr className="RampBreak--l" />

        <InputSelect<Employee>
          isLoading={isLoading}
          defaultValue={EMPTY_EMPLOYEE}
          items={employees === null ? [] : [EMPTY_EMPLOYEE, ...employees]}
          label="Filter by employee"
          loadingLabel="Loading employees"
          parseItem={(item) => ({
            value: item.id,
            label: `${item.firstName} ${item.lastName}`,
          })}
          onChange={async (newValue) => {
            console.log('Selected Value:', newValue);
            if (newValue?.id === EMPTY_EMPLOYEE.id) {
              // reset the list of transactions
              await loadAllTransactions()
              return
            } else if (!newValue) {
              return
            }
            await loadTransactionsByEmployee(newValue?.id)
          }}
        />

        <div className="RampBreak--l" />

        <div className="RampGrid">
          <Transactions transactions={localTransactions} />

          {localTransactions !== null && (
            <button
              className="RampButton"
              disabled={paginatedTransactionsUtils.loading || paginatedTransactions?.nextPage == null || transactionsByEmployee?.length === 0}
              onClick={async () => {
                await loadAllTransactions()
              }}
            >
              View More
            </button>
          )}
          <button className="RampButton" onClick={() => {
            if (localTransactions.length > 0) {
              handleApproveTransaction(localTransactions[0].id)
            }
          }}>
            Approve First
          </button>

          <button className="RampButton" onClick={() => {
            if (localTransactions.length > 0) {
              handleDeclineTransaction(localTransactions[0].id)
            }
          }}>
            Decline First
          </button>
        </div>
        <div className="approved_transactions w-full Ramp-Gri">
          <Transactions transactions={approvedTransactions} />

          {approvedTransactions !== null && (
            <button
              className="RampButton w-full relative"
              disabled={paginatedTransactionsUtils.loading || paginatedTransactions?.nextPage == null || transactionsByEmployee?.length === 0}
              onClick={async () => {
                await loadAllTransactions()
              }}
            >
              View More
            </button>
          )}
        </div>
      </main>
    </Fragment>
  )
}
