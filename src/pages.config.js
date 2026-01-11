import BankAccountDetail from './pages/BankAccountDetail';
import CardDetail from './pages/CardDetail';
import Dashboard from './pages/Dashboard';
import LoanDetail from './pages/LoanDetail';
import BillDetail from './pages/BillDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "BankAccountDetail": BankAccountDetail,
    "CardDetail": CardDetail,
    "Dashboard": Dashboard,
    "LoanDetail": LoanDetail,
    "BillDetail": BillDetail,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};