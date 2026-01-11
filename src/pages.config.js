import BankAccountDetail from './pages/BankAccountDetail';
import BillDetail from './pages/BillDetail';
import CardDetail from './pages/CardDetail';
import LoanDetail from './pages/LoanDetail';
import Dashboard from './pages/Dashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "BankAccountDetail": BankAccountDetail,
    "BillDetail": BillDetail,
    "CardDetail": CardDetail,
    "LoanDetail": LoanDetail,
    "Dashboard": Dashboard,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};