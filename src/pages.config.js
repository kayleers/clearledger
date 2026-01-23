import BankAccountDetail from './pages/BankAccountDetail';
import BillDetail from './pages/BillDetail';
import CardDetail from './pages/CardDetail';
import Dashboard from './pages/Dashboard';
import LoanDetail from './pages/LoanDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "BankAccountDetail": BankAccountDetail,
    "BillDetail": BillDetail,
    "CardDetail": CardDetail,
    "Dashboard": Dashboard,
    "LoanDetail": LoanDetail,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};