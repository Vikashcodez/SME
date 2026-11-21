import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HelpCircle,
  Bot,
  X,
  Send,
  Sparkles,
  RotateCcw,
  ExternalLink,
  BookOpen,
  FileSpreadsheet,
  DollarSign,
  Package,
  ShoppingCart,
  Truck,
  FileText,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldCheck,
  Building2,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  MessageCircle,
  Lightbulb,
  CornerDownRight,
  FolderOpen,
  MousePointerClick,
  Check,
  Search,
  ArrowRight,
  Layers,
  MapPin
} from 'lucide-react';

/**
 * TutorialChatbot - An Interactive Beginner-Friendly Software Guide & Chatbot
 *
 * Reads actual sidebar navigation hierarchy (parent menu -> sub menu -> page route)
 * and guides beginners with exact button locations, modal inputs, and verification tabs.
 */
const TutorialChatbot = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isBranchAdmin, isCompanyAdmin, isSuperAdmin, user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPopupBubble, setShowPopupBubble] = useState(true);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [activeStepTab, setActiveStepTab] = useState({}); // for tabbed steps in responses
  const messagesEndRef = useRef(null);

  // Helper to resolve role-specific route
  const getRoleRoute = (baseRoute) => {
    if (isBranchAdmin) {
      if (baseRoute === '/dashboard') return '/branch-admin-dashboard';
      if (!baseRoute.startsWith('/branch')) return `/branch${baseRoute}`;
    }
    return baseRoute;
  };

  // Helper to get real sidebar navigation path based on user role
  const getSidebarLocation = (navInfo) => {
    if (isBranchAdmin && navInfo.branchAdmin) {
      return navInfo.branchAdmin;
    }
    return navInfo.companyAdmin || navInfo;
  };

  // Comprehensive Beginner Tutorials Knowledge Base
  const TUTORIALS = useMemo(() => [
    {
      id: 'current-asset-liability',
      title: 'How to Enter Current Assets and Current Liabilities',
      category: 'Finance & Accounting (Tally)',
      icon: DollarSign,
      nav: {
        companyAdmin: {
          parentMenu: 'Overview',
          subMenu: 'Ledger & Banking',
          path: '/ledger-management'
        },
        branchAdmin: {
          parentMenu: 'Finance & Accounting',
          subMenu: 'Ledger & Banking',
          path: '/branch/ledger-management'
        }
      },
      route: '/ledger-management',
      pageName: 'Ledger & Banking / Chart of Accounts',
      button: {
        label: '+ New Ledger',
        style: 'bg-indigo-600 text-white font-semibold',
        location: 'Top-Right Header of the page (next to "Import Data" and "+ New Bank")'
      },
      modalTitle: 'Create New Ledger',
      keywords: [
        'current asset', 'current library', 'current liability', 'asset', 'liability', 
        'assets and liabilities', 'how to enter asset', 'how to enter liability', 
        'cash', 'bank', 'sundry debtors', 'sundry creditors', 'duties and taxes'
      ],
      sections: [
        {
          title: 'PART 1: How to Enter a Current Asset (Cash, Bank, Debtors)',
          steps: [
            {
              stepNum: 1,
              title: 'Open the Ledger & Banking Screen from the Sidebar',
              detail: isBranchAdmin 
                ? 'Look at the Left Sidebar. Click to expand "Finance & Accounting", then click "Ledger & Banking".'
                : 'Look at the Left Sidebar. Under the "Overview" section, click "Ledger & Banking" (or under "Master Data", click "Chart of Accounts").',
              hasAction: true
            },
            {
              stepNum: 2,
              title: 'Click the "+ New Ledger" Button',
              detail: 'At the Top-Right corner of the screen, click the purple button labeled "+ New Ledger". A popup modal titled "Create New Ledger" will open on your screen.'
            },
            {
              stepNum: 3,
              title: 'Fill in the Asset Account Details',
              detail: 'Fill out the form fields with the following data:',
              fields: [
                { name: 'Parent Account Group *', value: 'Select "Current Assets · ASSET", "Bank Accounts · ASSET", "Cash-in-hand · ASSET", or "Sundry Debtors · ASSET"' },
                { name: 'Ledger Name *', value: 'Type the asset name (e.g. "Petty Cash Box", "HDFC Bank Operating A/c", or "Customer ABC Debt")' },
                { name: 'Ledger Code', value: 'Type a short code (e.g. "LED-ASSET-01") or leave blank for auto-numbering' },
                { name: 'Opening Balance & Nature *', value: 'Type your opening asset amount (e.g. 50000.00). In the dropdown on the right, SELECT "DR" (Debit) — Assets always carry a Debit balance!' }
              ]
            },
            {
              stepNum: 4,
              title: 'Click "Create Ledger" at the Bottom-Right of the Modal',
              detail: 'Click the purple "Create Ledger" button. The modal closes and your new asset ledger is created.'
            },
            {
              stepNum: 5,
              title: 'Verify in the "ASSET" Tab',
              detail: 'Directly below the top KPI balance cards on the page, click the "ASSET" filter tab. Your newly added asset ledger will appear with its live DR balance!'
            }
          ]
        },
        {
          title: 'PART 2: How to Enter a Current Liability (Creditors, Taxes, Dues)',
          steps: [
            {
              stepNum: 1,
              title: 'Click "+ New Ledger" at the Top-Right Header',
              detail: 'On the same Ledger & Banking screen, click the "+ New Ledger" button again.'
            },
            {
              stepNum: 2,
              title: 'Fill in the Liability Account Details',
              detail: 'Enter the following data in the modal fields:',
              fields: [
                { name: 'Parent Account Group *', value: 'Select "Current Liabilities · LIABILITY", "Duties & Taxes · LIABILITY", or "Sundry Creditors · LIABILITY"' },
                { name: 'Ledger Name *', value: 'Type the liability name (e.g. "GST Output Payable", "Sundry Creditor - Steel Corp", or "Outstanding Wages")' },
                { name: 'Opening Balance & Nature *', value: 'Type your opening balance (e.g. 25000.00). In the dropdown, SELECT "CR" (Credit) — Liabilities always carry a Credit balance!' }
              ]
            },
            {
              stepNum: 3,
              title: 'Click "Create Ledger" & Verify in the "LIABILITY" Tab',
              detail: 'Click "Create Ledger" at the bottom-right. Then click the "LIABILITY" filter tab below the balance cards to see your liability ledger active with its CR balance.'
            }
          ]
        }
      ],
      goldenRule: 'Golden Accounting Rule: Assets and Expenses normally have DEBIT (DR) balances. Liabilities, Capital, and Income normally have CREDIT (CR) balances.',
      related: ['ledger-management', 'day-book', 'balance-sheet']
    },
    {
      id: 'ledger-management',
      title: 'How to Enter a General Ledger (Expense, Income, Capital)',
      category: 'Finance & Accounting (Tally)',
      icon: DollarSign,
      nav: {
        companyAdmin: {
          parentMenu: 'Overview',
          subMenu: 'Ledger & Banking',
          path: '/ledger-management'
        },
        branchAdmin: {
          parentMenu: 'Finance & Accounting',
          subMenu: 'Ledger & Banking',
          path: '/branch/ledger-management'
        }
      },
      route: '/ledger-management',
      pageName: 'Ledger & Banking / Chart of Accounts',
      button: {
        label: '+ New Ledger',
        style: 'bg-indigo-600 text-white font-semibold',
        location: 'Top-Right Header of the screen'
      },
      modalTitle: 'Create New Ledger',
      keywords: ['ledger', 'account', 'chart of accounts', 'create ledger', 'add ledger', 'tally', 'gateway', 'accounting', 'opening balance', 'expense account', 'rent expense'],
      sections: [
        {
          title: 'Step-by-Step Navigation & Entry Guide',
          steps: [
            {
              stepNum: 1,
              title: 'Expand the Sidebar Parent Menu',
              detail: isBranchAdmin
                ? 'Open the Left Sidebar. Look for the parent menu section "Finance & Accounting", expand it, and click "Ledger & Banking".'
                : 'Open the Left Sidebar. Look for the parent menu "Overview" and click "Ledger & Banking" (or open "Master Data" > "Chart of Accounts").',
              hasAction: true
            },
            {
              stepNum: 2,
              title: 'Locate the "+ New Ledger" Button',
              detail: 'Look at the Top-Right Header of the Ledger page. You will see three buttons: [Import Data (Green)], [+ New Ledger (Purple)], and [+ New Bank (Emerald)]. Click "+ New Ledger".'
            },
            {
              stepNum: 3,
              title: 'Enter the Ledger Data in the Modal Form',
              detail: 'A modal popup opens. Enter the data into these fields:',
              fields: [
                { name: 'Parent Account Group *', value: 'Choose group: Asset, Liability, Equity, Income, or Expense (e.g. "Indirect Expenses · EXPENSE")' },
                { name: 'Ledger Name *', value: 'Type the ledger title (e.g. "Office Rent Expense", "Electricity Bill", "Audit Fee")' },
                { name: 'Opening Balance & Nature *', value: 'Enter amount (e.g. 0.00). Select DR for Expenses/Assets or CR for Incomes/Liabilities' }
              ]
            },
            {
              stepNum: 4,
              title: 'Save the Ledger',
              detail: 'Click the purple button "Create Ledger" at the bottom-right of the modal popup.'
            },
            {
              stepNum: 5,
              title: 'Filter by Nature Tabs to Inspect',
              detail: 'Click any of the filter tabs (ALL, ASSET, LIABILITY, EQUITY, INCOME, EXPENSE) to view your ledger with real-time balance calculations.'
            }
          ]
        }
      ],
      goldenRule: 'Expenses and Assets = Debit (DR). Liabilities and Income = Credit (CR).',
      related: ['current-asset-liability', 'day-book', 'balance-sheet']
    },
    {
      id: 'sales-invoice',
      title: 'How to Create a Sales Invoice & Handle Unpaid/Paid Sales',
      category: 'Sales & Commercial Billing',
      icon: ShoppingCart,
      nav: {
        companyAdmin: {
          parentMenu: 'Commercial & Accounting (Tally)',
          subMenu: 'Sales Invoices & Billing',
          path: '/sales-invoices'
        },
        branchAdmin: {
          parentMenu: 'Finance & Accounting',
          subMenu: 'Sales Invoices & Billing',
          path: '/branch/sales-invoices'
        }
      },
      route: '/sales-invoices',
      pageName: 'Sales Invoices & Billing',
      button: {
        label: '+ Create Sales Invoice',
        style: 'bg-blue-600 text-white font-semibold',
        location: 'Top-Right Header of the page'
      },
      modalTitle: 'Create Sales Invoice Modal',
      keywords: ['sales', 'invoice', 'sale', 'billing', 'customer payment', 'outstanding', 'cash in hand', 'bank', 'gst invoice'],
      sections: [
        {
          title: 'Step-by-Step Sales Invoicing & Payment Workflow',
          steps: [
            {
              stepNum: 1,
              title: 'Navigate to Sales Invoices',
              detail: isBranchAdmin
                ? 'In the Left Sidebar, expand "Finance & Accounting", then click "Sales Invoices & Billing".'
                : 'In the Left Sidebar, expand the parent section "Commercial & Accounting (Tally)", then click "Sales Invoices & Billing".',
              hasAction: true
            },
            {
              stepNum: 2,
              title: 'Click "+ Create Sales Invoice"',
              detail: 'Look at the Top-Right corner and click the blue button "+ Create Sales Invoice". The invoice generator screen opens.'
            },
            {
              stepNum: 3,
              title: 'Select Customer & Line Items',
              detail: 'Select the Customer from the dropdown (or type their name/GSTIN). In the Items table, click "+ Add Item", pick finished products, and enter Quantity and Rate. Taxes (CGST/SGST/IGST) calculate automatically.'
            },
            {
              stepNum: 4,
              title: 'Set Payment Terms (Outstanding vs Cash/Bank)',
              detail: 'If the customer HAS NOT paid yet, choose "Unpaid / Credit" so the amount stays in Customer Outstanding. When paid, select "Cash in Hand" (added to physical cash) or "Bank" (pick your bank account from the dropdown).'
            },
            {
              stepNum: 5,
              title: 'Click "Generate Invoice"',
              detail: 'Click the green "Generate Invoice" button at the bottom-right. The invoice is generated, inventory decreases, and vouchers post to the Day Book.'
            }
          ]
        }
      ],
      goldenRule: 'Unpaid sales are marked as Customer Outstanding and do NOT inflate your cash/bank book until payment is received.',
      related: ['current-asset-liability', 'day-book', 'product-master']
    },
    {
      id: 'purchase-grn',
      title: 'How to Inward Raw Materials with GRN (Goods Received Note)',
      category: 'Procurement & Inventory',
      icon: Truck,
      nav: {
        companyAdmin: {
          parentMenu: 'Inventory & Production',
          subMenu: 'Goods Receipt (GRN)',
          path: '/grn'
        },
        branchAdmin: {
          parentMenu: 'Inventory Management',
          subMenu: 'Goods Receipt (GRN)',
          path: '/branch/grn'
        }
      },
      route: '/grn',
      pageName: 'Goods Receipt (GRN)',
      button: {
        label: '+ Create Inward GRN',
        style: 'bg-emerald-600 text-white font-semibold',
        location: 'Top-Right Header of the page'
      },
      modalTitle: 'Inward Material GRN',
      keywords: ['purchase', 'grn', 'goods received', 'inward', 'vendor bill', 'buy', 'raw material purchase', 'supplier'],
      sections: [
        {
          title: 'Material Inward & Expense Recording Guide',
          steps: [
            {
              stepNum: 1,
              title: 'Navigate to GRN Screen',
              detail: isBranchAdmin
                ? 'In the Left Sidebar, expand "Inventory Management", then click "Goods Receipt (GRN)".'
                : 'In the Left Sidebar, expand "Inventory & Production", then click "Goods Receipt (GRN)".',
              hasAction: true
            },
            {
              stepNum: 2,
              title: 'Click "+ Create Inward GRN"',
              detail: 'At the Top-Right of the screen, click the emerald green button "+ Create Inward GRN".'
            },
            {
              stepNum: 3,
              title: 'Enter Vendor & Material Quantities',
              detail: 'Select the Vendor name, pick the received Raw Materials, specify the Received Quantity, Unit Price, and Lot/Batch Number. Attach the supplier invoice bill PDF/photo.'
            },
            {
              stepNum: 4,
              title: 'Submit GRN',
              detail: 'Click "Submit GRN". This immediately increases your Raw Materials Stock and logs a Purchase Expense debit in the Day Book.'
            }
          ]
        }
      ],
      goldenRule: 'GRN ensures that stock warehouse count and accounting purchase expenses remain perfectly synchronized.',
      related: ['raw-material-inventory', 'day-book', 'party-master']
    },
    {
      id: 'excel-import',
      title: 'How to Import Data from Excel or Google Sheets (with Photos)',
      category: 'Data Management & Excel',
      icon: FileSpreadsheet,
      nav: {
        companyAdmin: {
          parentMenu: 'Master Data',
          subMenu: 'Product Master (or any Master Page)',
          path: '/products'
        },
        branchAdmin: {
          parentMenu: 'Inventory Management',
          subMenu: 'Product Master (or any Master Page)',
          path: '/branch/products'
        }
      },
      route: '/products',
      pageName: 'Excel & Google Sheets Workstation (On All Master Pages)',
      button: {
        label: 'Import Data',
        style: 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold',
        location: 'Top-Right Header of ANY Master Page (Products, Raw Materials, Ledgers, Parties, Employees)'
      },
      modalTitle: 'Import Workstation',
      keywords: ['excel', 'import', 'google sheet', 'spreadsheet', 'bulk import', 'upload excel', 'photo upload', 'pan link', 'gst link', 'template'],
      sections: [
        {
          title: '3-Tab Excel Workstation Guide',
          steps: [
            {
              stepNum: 1,
              title: 'Open Any Master Page and Click "Import Data"',
              detail: 'Go to any page where you want to add data (Products, Raw Materials, Parties, Employees, Ledgers). Look at the Top-Right Header and click the green button "Import Data".',
              hasAction: true
            },
            {
              stepNum: 2,
              title: 'Tab 1: Excel Grid Sheet (Direct Typing)',
              detail: 'A complete Excel-like spreadsheet appears with column letters (A, B, C...) and row numbers. Click any cell to type directly! Use Enter or Down Arrow to move to the next row.'
            },
            {
              stepNum: 3,
              title: 'Upload Images in Cells',
              detail: 'In the Photo/Image column, click the camera icon "+ Upload Image" in any row to upload a picture directly from your computer. It creates an instant live thumbnail!'
            },
            {
              stepNum: 4,
              title: 'Smart Foreign Key Linking',
              detail: 'In relation columns (like Branch, Party, Vendor), do NOT worry about database ID numbers! Simply type the Name, GSTIN, PAN Number, or Code — the system links the primary key automatically.'
            },
            {
              stepNum: 5,
              title: 'Tabs 2 & 3: File Upload or Google Sheets',
              detail: 'You can also download the pre-formatted .xlsx template in Tab 2, or paste a Google Sheet public link in Tab 3.'
            },
            {
              stepNum: 6,
              title: 'Click "Import Data to Database"',
              detail: 'At the bottom-right of the modal, click the green button "Import Data to Database" to insert all valid rows into your system.'
            }
          ]
        }
      ],
      goldenRule: 'You can use the "+ Row" or "+ 5 Rows" buttons inside the Excel Grid Sheet to add rows as you type.',
      related: ['product-master', 'current-asset-liability', 'party-master']
    },
    {
      id: 'day-book',
      title: 'How to View Gateway of Tally, Day Book, Balance Sheet & Trial Balance',
      category: 'Financial Statements',
      icon: FileText,
      nav: {
        companyAdmin: {
          parentMenu: 'Commercial & Accounting (Tally)',
          subMenu: 'Day Book & Vouchers',
          path: '/day-book'
        },
        branchAdmin: {
          parentMenu: 'Finance & Accounting',
          subMenu: 'Day Book & Vouchers',
          path: '/branch/day-book'
        }
      },
      route: '/day-book',
      pageName: 'Day Book & Financial Statements',
      button: {
        label: 'Date Range Filter',
        style: 'bg-white text-slate-700 border border-slate-300',
        location: 'Top Bar of the Day Book screen'
      },
      keywords: ['day book', 'gateway of tally', 'tally', 'balance sheet', 'trial balance', 'profit and loss', 'debit book', 'financials'],
      sections: [
        {
          title: 'How to Inspect Financial Books',
          steps: [
            {
              stepNum: 1,
              title: 'Navigate to Day Book',
              detail: isBranchAdmin
                ? 'In the Left Sidebar, expand "Finance & Accounting", then click "Day Book & Vouchers".'
                : 'In the Left Sidebar, expand "Commercial & Accounting (Tally)", then click "Day Book & Vouchers".',
              hasAction: true
            },
            {
              stepNum: 2,
              title: 'Filter Transactions by Date',
              detail: 'Use the Date Range picker at the top to select Today, This Month, or a Custom Range to view all double-entry debit and credit vouchers.'
            },
            {
              stepNum: 3,
              title: 'View Balance Sheet & Trial Balance',
              detail: 'To see your Net Worth and Assets vs Liabilities: Open "Balance Sheet" from the sidebar. To verify Debit = Credit balance integrity: Open "Trial Balance & Audit".'
            }
          ]
        }
      ],
      goldenRule: 'Trial Balance ensures that every debit entry has a corresponding credit entry across all ledgers.',
      related: ['current-asset-liability', 'ledger-management', 'sales-invoice']
    },
    {
      id: 'product-master',
      title: 'How to Create Products & Define BOM (Bill of Materials)',
      category: 'Master Data & Manufacturing',
      icon: Package,
      nav: {
        companyAdmin: {
          parentMenu: 'Master Data',
          subMenu: 'Product Master',
          path: '/products'
        },
        branchAdmin: {
          parentMenu: 'Inventory Management',
          subMenu: 'Product Master',
          path: '/branch/products'
        }
      },
      route: '/products',
      pageName: 'Product Master Management',
      button: {
        label: '+ Add Product',
        style: 'bg-indigo-600 text-white font-semibold',
        location: 'Top-Right Header of the screen'
      },
      modalTitle: 'Add Product Modal',
      keywords: ['product', 'item', 'finished goods', 'product master', 'bom', 'bill of materials', 'hsn', 'gst rate'],
      sections: [
        {
          title: 'Product Registration Walkthrough',
          steps: [
            {
              stepNum: 1,
              title: 'Navigate to Product Master',
              detail: isBranchAdmin
                ? 'In Left Sidebar, expand "Inventory Management", then click "Product Master".'
                : 'In Left Sidebar, expand "Master Data", then click "Product Master".',
              hasAction: true
            },
            {
              stepNum: 2,
              title: 'Click "+ Add Product"',
              detail: 'Look at the Top-Right Header and click the "+ Add Product" button.'
            },
            {
              stepNum: 3,
              title: 'Fill Product Specifications',
              detail: 'Enter Product Name, Category (Finished Goods), UOM (PCS, KG), Selling Price, Cost Price, HSN Code, and GST Rate (e.g. 18%). Upload product photos.'
            },
            {
              stepNum: 4,
              title: 'Save Product',
              detail: 'Click "Save Product" at the bottom of the modal. The product is immediately ready for sales invoicing and production orders.'
            }
          ]
        }
      ],
      goldenRule: 'Assigning accurate HSN codes ensures automatic GST computation during sales invoicing.',
      related: ['excel-import', 'sales-invoice', 'purchase-grn']
    }
  ], [isBranchAdmin]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'bot',
          type: 'welcome',
          text: `Hello! I am your Step-by-Step ERP Tutorial Assistant. I can tell you exactly which Sidebar Menu to expand, which Sub-Menu to click, where the button is located on the screen, and what exact data to type!`,
          suggestions: [
            'How to enter Current Assets & Current Liabilities?',
            'How to enter a Ledger?',
            'How to make a Sales Invoice?',
            'How to record Purchase GRN?',
            'How to import Excel or Google Sheets?'
          ]
        }
      ]);
    }
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Match user query to knowledge base
  const findBestTutorial = (query) => {
    const cleanQuery = query.toLowerCase().trim();
    const queryTokens = cleanQuery.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

    let bestMatch = null;
    let highestScore = 0;

    TUTORIALS.forEach(tut => {
      let score = 0;
      if (tut.title.toLowerCase().includes(cleanQuery)) score += 25;

      tut.keywords.forEach(keyword => {
        if (cleanQuery.includes(keyword)) score += 12;
        queryTokens.forEach(tok => {
          if (keyword.includes(tok)) score += 4;
        });
      });

      if (score > highestScore) {
        highestScore = score;
        bestMatch = tut;
      }
    });

    return highestScore >= 8 ? bestMatch : null;
  };

  // Handle user sending a question
  const handleSendMessage = (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    setShowPopupBubble(false);

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    setTimeout(() => {
      const match = findBestTutorial(text);

      if (match) {
        const botMsg = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          type: 'tutorial',
          tutorial: match
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        const botMsg = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          type: 'fallback',
          text: `I couldn't find an exact match for "${text}". Here are the most common step-by-step beginner tutorials:`,
          options: TUTORIALS.slice(0, 5)
        };
        setMessages(prev => [...prev, botMsg]);
      }
    }, 250);
  };

  // Handle quick topic click
  const handleSelectTutorial = (tutorial) => {
    setShowPopupBubble(false);
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: tutorial.title
    };
    const botMsg = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      type: 'tutorial',
      tutorial
    };
    setMessages(prev => [...prev, userMsg, botMsg]);
  };

  // Reset conversation
  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'bot',
        type: 'welcome',
        text: 'Chat reset. What would you like to learn how to do? Click any topic below or type your question:',
        suggestions: [
          'How to enter Current Assets & Current Liabilities?',
          'How to enter a Ledger?',
          'How to make a Sales Invoice?',
          'How to record Purchase GRN?',
          'How to import Excel or Google Sheets?'
        ]
      }
    ]);
  };

  // Direct Navigate Handler
  const handleNavigateToPage = (route) => {
    const targetRoute = getRoleRoute(route);
    navigate(targetRoute);
  };

  return (
    <>
      {/* 1. FLOATING ATTENTION-GRABBING POPUP BUBBLE & QUESTION MARK TRIGGER */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        
        {/* "Help, help. Need help?" Attention Bubble Popup */}
        {showPopupBubble && !isOpen && (
          <div 
            onClick={() => {
              setIsOpen(true);
              setShowPopupBubble(false);
            }}
            className="mb-3 max-w-xs sm:max-w-sm bg-white rounded-2xl p-3.5 shadow-2xl border-2 border-emerald-500/80 text-slate-800 cursor-pointer animate-in fade-in slide-in-from-bottom-3 duration-200 hover:scale-102 transition-all relative group"
          >
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={18} className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-800 flex items-center gap-1">
                    <Sparkles size={12} className="text-amber-500" />
                    <span>Help, help. Need help?</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPopupBubble(false);
                    }}
                    className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                    title="Dismiss"
                  >
                    <X size={13} />
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  Click here! Ask me <b>how to use this software</b>, enter ledgers, add current assets & liabilities, or navigate the sidebar.
                </p>
                <div className="pt-0.5 flex items-center gap-1 text-2xs text-emerald-700 font-bold">
                  <span>Start Tutorial Chat</span>
                  <CornerDownRight size={11} />
                </div>
              </div>
            </div>

            {/* Speech bubble tail pointer */}
            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-r-2 border-b-2 border-emerald-500/80 rotate-45 transform" />
          </div>
        )}

        {/* Floating Question Mark / Bot Circular Button */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(prev => !prev);
            if (!isOpen) setShowPopupBubble(false);
          }}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all transform cursor-pointer ${
            isOpen 
              ? 'bg-slate-800 text-white rotate-90 hover:bg-slate-900' 
              : 'bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white hover:scale-108 active:scale-95 ring-4 ring-emerald-400/30'
          }`}
          title={isOpen ? 'Close Tutorial Bot' : 'Need Help? Open Tutorial Chatbot'}
        >
          {isOpen ? (
            <X size={26} />
          ) : (
            <div className="relative flex items-center justify-center">
              <HelpCircle size={28} className="text-white" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 border-2 border-white rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 border-2 border-white rounded-full" />
            </div>
          )}
        </button>
      </div>

      {/* 2. CHATBOT TUTORIAL WINDOW */}
      {isOpen && (
        <div className={`fixed bottom-20 sm:bottom-22 right-3 sm:right-6 z-50 ${
          isExpanded 
            ? 'w-[96vw] sm:w-[620px] h-[min(720px,calc(100dvh-5.5rem))] max-h-[calc(100dvh-5.5rem)]' 
            : 'w-[95vw] sm:w-[480px] h-[min(560px,calc(100dvh-6.2rem))] max-h-[calc(100dvh-6.2rem)]'
        } bg-white rounded-2xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-all`}>
          
          {/* Chatbot Header */}
          <div className="px-4 py-2.5 bg-linear-to-r from-emerald-700 via-teal-700 to-slate-800 text-white flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center text-white shadow-2xs shrink-0">
                <Bot size={18} className="text-emerald-200" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-800 rounded-full" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold tracking-tight flex items-center gap-1.5">
                  <span>Beginner ERP Tutorial Guide</span>
                  <span className="text-3xs font-semibold px-1.5 py-0.2 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                    Step-by-Step
                  </span>
                </h3>
                <p className="text-3xs sm:text-2xs text-emerald-100/80">
                  Real Sidebar navigation, exact button locations & field data
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsExpanded(prev => !prev)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer hidden sm:block"
                title={isExpanded ? 'Restore window size' : 'Expand window'}
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                title="Restart conversation"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                title="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Topic Chips Slider */}
          <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-2xs scrollbar-none shrink-0">
            <span className="text-slate-400 font-bold shrink-0 text-3xs uppercase tracking-wider pl-1">
              Topics:
            </span>
            {TUTORIALS.map(tut => (
              <button
                key={tut.id}
                type="button"
                onClick={() => handleSelectTutorial(tut)}
                className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-lg shrink-0 font-medium transition-all shadow-3xs cursor-pointer flex items-center gap-1"
              >
                <span>{tut.title.replace('How to ', '').split('&')[0].trim()}</span>
              </button>
            ))}
          </div>

          {/* Chat Messages Stream */}
          <div className="p-4 overflow-y-auto space-y-4 flex-1 bg-slate-50/70 text-xs">
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-2">
                
                {/* User Message */}
                {msg.sender === 'user' && (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-emerald-600 text-white rounded-2xl rounded-tr-xs px-3.5 py-2.5 shadow-xs text-xs font-medium">
                      {msg.text}
                    </div>
                  </div>
                )}

                {/* Bot Welcome Message */}
                {msg.sender === 'bot' && msg.type === 'welcome' && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={15} />
                    </div>
                    <div className="space-y-2.5 max-w-[88%]">
                      <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-2xs border border-slate-200 text-slate-700 leading-relaxed">
                        {msg.text}
                      </div>

                      {/* Suggested Prompts */}
                      <div className="space-y-1.5">
                        <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider">
                          Click to see exact step-by-step tutorial:
                        </span>
                        <div className="space-y-1">
                          {msg.suggestions.map((sug, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleSendMessage(sug)}
                              className="w-full text-left px-3 py-1.5 bg-white hover:bg-emerald-50/80 text-emerald-800 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all shadow-3xs font-medium text-xs flex items-center justify-between group cursor-pointer"
                            >
                              <span>{sug}</span>
                              <ChevronRight size={13} className="text-slate-300 group-hover:text-emerald-600 transition-colors" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bot Tutorial Step-by-Step Response */}
                {msg.sender === 'bot' && msg.type === 'tutorial' && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                      <BookOpen size={15} />
                    </div>
                    
                    <div className="bg-white rounded-2xl rounded-tl-xs p-4 shadow-sm border border-slate-200 text-slate-800 space-y-3.5 max-w-[92%]">
                      
                      {/* Tutorial Header */}
                      <div className="border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-1.5 text-2xs font-bold text-emerald-700 mb-0.5">
                          <Sparkles size={12} />
                          <span>{msg.tutorial.category}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 leading-tight">
                          {msg.tutorial.title}
                        </h4>
                      </div>

                      {/* 1. EXACT REAL SIDEBAR NAVIGATION BOX */}
                      {msg.tutorial.nav && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <div className="text-3xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <FolderOpen size={12} className="text-emerald-600" />
                            <span>1. Sidebar Navigation Path:</span>
                          </div>
                          
                          {/* Visual Breadcrumb Steps */}
                          <div className="flex flex-wrap items-center gap-1 text-2xs font-medium text-slate-700 bg-white p-2 rounded-lg border border-slate-200 shadow-3xs">
                            <span className="font-bold text-slate-800">Left Sidebar</span>
                            <ChevronRight size={12} className="text-slate-400" />
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                              Expand "{getSidebarLocation(msg.tutorial.nav).parentMenu}"
                            </span>
                            <ChevronRight size={12} className="text-slate-400" />
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 font-bold border border-blue-200">
                              Click "{getSidebarLocation(msg.tutorial.nav).subMenu}"
                            </span>
                          </div>

                          {/* Direct 1-Click Interactive Navigation Button */}
                          <button
                            type="button"
                            onClick={() => handleNavigateToPage(msg.tutorial.route)}
                            className="w-full py-2 px-3 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs group"
                          >
                            <ExternalLink size={13} className="group-hover:scale-110 transition-transform" />
                            <span>🚀 Take Me There: Open {getSidebarLocation(msg.tutorial.nav).subMenu} Page</span>
                          </button>
                        </div>
                      )}

                      {/* 2. EXACT BUTTON LOCATION ON PAGE */}
                      {msg.tutorial.button && (
                        <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-200/80 space-y-1">
                          <div className="text-3xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                            <MousePointerClick size={12} className="text-indigo-600" />
                            <span>2. Button to Click on This Page:</span>
                          </div>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="px-2 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-2xs">
                              {msg.tutorial.button.label}
                            </span>
                            <span className="text-2xs text-slate-600 leading-tight">
                              Located at: <b>{msg.tutorial.button.location}</b>
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 3. STEP-BY-STEP SECTIONS (TABS OR NUMBERED INSTRUCTIONS) */}
                      {msg.tutorial.sections ? (
                        <div className="space-y-3 pt-1">
                          {msg.tutorial.sections.map((section, secIdx) => (
                            <div key={secIdx} className="space-y-2 p-3 bg-white rounded-xl border border-slate-200 shadow-3xs">
                              <h5 className="font-bold text-xs text-emerald-900 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                                <CheckCircle2 size={13} className="text-emerald-600" />
                                <span>{section.title}</span>
                              </h5>

                              <div className="space-y-2.5 pt-1">
                                {section.steps.map((st, sIdx) => (
                                  <div key={sIdx} className="space-y-1">
                                    <div className="flex items-start gap-2">
                                      <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 font-black text-2xs flex items-center justify-center shrink-0 mt-0.5 shadow-3xs">
                                        {st.stepNum}
                                      </span>
                                      <div className="space-y-0.5">
                                        <h6 className="font-bold text-xs text-slate-800">
                                          {st.title}
                                        </h6>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                          {st.detail}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Detailed Input Fields Table if available */}
                                    {st.fields && (
                                      <div className="ml-7 p-2 rounded-lg bg-slate-50 border border-slate-200 text-2xs space-y-1">
                                        <span className="font-bold text-slate-700 block text-3xs uppercase tracking-wider">
                                          Type exactly into these form fields:
                                        </span>
                                        <div className="space-y-1">
                                          {st.fields.map((f, fIdx) => (
                                            <div key={fIdx} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 border-b border-slate-100 pb-1 last:border-0 last:pb-0">
                                              <span className="font-bold text-slate-900 shrink-0 min-w-[120px]">
                                                {f.name}:
                                              </span>
                                              <span className="text-slate-600 font-mono text-3xs sm:text-2xs">
                                                {f.value}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* Standard Steps */
                        <div className="space-y-2 pt-1">
                          {msg.tutorial.steps.map((step, sIdx) => (
                            <div key={sIdx} className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                              <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-2xs flex items-center justify-center shrink-0 mt-0.5 shadow-3xs">
                                {sIdx + 1}
                              </span>
                              <p className="text-xs text-slate-700 leading-relaxed">
                                {step}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Golden Rule / Pro Tip Callout */}
                      {msg.tutorial.goldenRule && (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-2xs leading-relaxed flex items-start gap-2">
                          <Lightbulb size={14} className="text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Golden Accounting Rule: </span>
                            <span>{msg.tutorial.goldenRule}</span>
                          </div>
                        </div>
                      )}

                      {/* Related Topics Quick Links */}
                      {msg.tutorial.related && (
                        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                          <span className="text-3xs text-slate-400 font-semibold">Related:</span>
                          {msg.tutorial.related.map(relId => {
                            const rel = TUTORIALS.find(t => t.id === relId);
                            if (!rel) return null;
                            return (
                              <button
                                key={rel.id}
                                type="button"
                                onClick={() => handleSelectTutorial(rel)}
                                className="text-3xs px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 border border-slate-200 cursor-pointer transition-colors"
                              >
                                {rel.title.split('&')[0].replace('How to ', '').trim()}
                              </button>
                            );
                          })}
                        </div>
                      )}

                    </div>
                  </div>
                )}

                {/* Bot Fallback Response */}
                {msg.sender === 'bot' && msg.type === 'fallback' && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                      <HelpCircle size={15} />
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-2xs border border-slate-200 text-slate-800 space-y-2.5 max-w-[88%]">
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {msg.text}
                      </p>
                      <div className="space-y-1 pt-1">
                        {msg.options.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectTutorial(opt)}
                            className="w-full text-left px-2.5 py-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-200 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span>{opt.title}</span>
                            <ChevronRight size={13} className="text-slate-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chatbot Input Box */}
          <div className="p-2.5 sm:p-3 bg-white border-t border-slate-200 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask e.g. 'How to enter current asset & liability?' or 'Where is ledger?'"
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/70"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-2xs transition-all cursor-pointer shrink-0"
                title="Send question"
              >
                <Send size={15} />
              </button>
            </form>
          </div>

        </div>
      )}
    </>
  );
};

export default TutorialChatbot;
