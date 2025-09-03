"use strict";
// Global variables
const appPages = ['dashboard', 'settings'];
// Global variables
const { html, render: renderElem } = uhtml;
//Checks for internet connection status
if (!navigator.onLine)
    floGlobals.connectionErrorNotification = notify('There seems to be a problem connecting to the internet, Please check you internet connection.', 'error')
window.addEventListener('offline', () => {
    floGlobals.connectionErrorNotification = notify('There seems to be a problem connecting to the internet, Please check you internet connection.', 'error')
})
window.addEventListener('online', () => {
    getRef('notification_drawer').remove(floGlobals.connectionErrorNotification)
    notify('We are back online.', 'success')
})

// Use instead of document.getElementById
const domRefs = {};
function getRef(elementId) {
    if (!domRefs.hasOwnProperty(elementId)) {
        domRefs[elementId] = {
            count: 1,
            ref: null,
        };
        return document.getElementById(elementId);
    } else {
        if (domRefs[elementId].count < 3) {
            domRefs[elementId].count = domRefs[elementId].count + 1;
            return document.getElementById(elementId);
        } else {
            if (!domRefs[elementId].ref)
                domRefs[elementId].ref = document.getElementById(elementId);
            return domRefs[elementId].ref;
        }
    }
}

// Use when a function needs to be executed after user finishes changes
const debounce = (callback, wait) => {
    let timeoutId = null;
    return (...args) => {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
            callback.apply(null, args);
        }, wait);
    };
}

//Function for displaying toast notifications. pass in error for mode param if you want to show an error.
function notify(message, mode, options = {}) {
    let icon
    switch (mode) {
        case 'success':
            icon = `<svg class="icon icon--success" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"/></svg>`
            break;
        case 'error':
            icon = `<svg class="icon icon--error" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"/></svg>`
            options.pinned = true
            break;
    }
    if (mode === 'error') {
        console.error(message)
    }
    return getRef("notification_drawer").push(message, { icon, ...options });
}

function getFormattedTime(timestamp, format) {
    try {
        timestamp = parseInt(timestamp)
        if (String(timestamp).length < 13)
            timestamp *= 1000
        let [day, month, date, year] = new Date(timestamp).toString().split(' '),
            minutes = new Date(timestamp).getMinutes(),
            hours = new Date(timestamp).getHours(),
            currentTime = new Date().toString().split(' ')

        minutes = minutes < 10 ? `0${minutes}` : minutes
        let finalHours = ``;
        if (hours > 12)
            finalHours = `${hours - 12}:${minutes}`
        else if (hours === 0)
            finalHours = `12:${minutes}`
        else
            finalHours = `${hours}:${minutes}`

        finalHours = hours >= 12 ? `${finalHours} PM` : `${finalHours} AM`
        switch (format) {
            case 'date-only':
                return `${month} ${date}, ${year}`;
            case 'time-only':
                return finalHours;
            case 'relative':
                return relativeTime.from(timestamp)
            default:
                return `${month} ${date}, ${year} at ${finalHours}`;
        }
    } catch (e) {
        console.error(e);
        return timestamp;
    }
}

window.addEventListener('hashchange', e => routeTo(window.location.hash))
window.addEventListener("load", () => {
    document.body.classList.remove('hidden')
    document.addEventListener("pointerdown", (e) => {
        if (e.target.closest("button, .interact")) {
            createRipple(e, e.target.closest("button, .interact"));
        }
    });
    document.addEventListener('copy', () => {
        notify('copied', 'success')
    })
    document.addEventListener('keydown', e => {
        if (e.key === '/') {
            e.preventDefault();
            getRef('search_payments').focusIn()
        }
    })
    getRef('search_payments').addEventListener('input', e => {
        const searchQuery = e.target.value.toLowerCase();
        const filteredInterns = []
        floGlobals.internTxs.forEach((intern, floId) => {
            if (floId.toLowerCase().includes(searchQuery) || floGlobals.appObjects.RIBC.internList[floId].toLowerCase().includes(searchQuery))
                filteredInterns.push({ floId, name: floGlobals.appObjects.RIBC.internList[floId] })
        })
        // sort filtered by relevance to search query (name first, then floId)
        filteredInterns.sort((a, b) => {
            if (a.name.toLowerCase().includes(searchQuery) && b.name.toLowerCase().includes(searchQuery)) {
                return a.name.toLowerCase().indexOf(searchQuery) - b.name.toLowerCase().indexOf(searchQuery)
            } else if (a.name.toLowerCase().includes(searchQuery)) {
                return -1
            } else if (b.name.toLowerCase().includes(searchQuery)) {
                return 1
            } else {
                return a.floId.toLowerCase().indexOf(searchQuery) - b.floId.toLowerCase().indexOf(searchQuery)
            }
        })
        renderElem(getRef("intern_payment_list"), html`${filteredInterns.map(intern => render.internCard(intern.floId))}`);
    })
});

function createRipple(event, target) {
    const circle = document.createElement("span");
    const diameter = Math.max(target.clientWidth, target.clientHeight);
    const radius = diameter / 2;
    const targetDimensions = target.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - (targetDimensions.left + radius)}px`;
    circle.style.top = `${event.clientY - (targetDimensions.top + radius)}px`;
    circle.classList.add("ripple");
    const rippleAnimation = circle.animate(
        [
            {
                transform: "scale(3)",
                opacity: 0,
            },
        ],
        {
            duration: 1000,
            fill: "forwards",
            easing: "ease-out",
        }
    );
    target.append(circle);
    rippleAnimation.onfinish = () => {
        circle.remove();
    };
}

const appState = {
    params: {},
}
function routeTo(targetPage) {
    const routingAnimation = { in: slideInUp, out: slideOutUp }
    let pageId
    let subPageId1
    let searchParams
    let params
    if (targetPage === '') {
        pageId = 'home'
        history.replaceState(null, null, '#/home');
    } else {
        if (targetPage.includes('/')) {
            if (targetPage.includes('?')) {
                const splitAddress = targetPage.split('?')
                searchParams = splitAddress.pop();
                [, pageId, subPageId1] = splitAddress.pop().split('/')
            } else {
                [, pageId, subPageId1] = targetPage.split('/')
            }
        } else {
            pageId = targetPage
        }
    }
    if (!getRef(pageId)?.classList.contains('page')) return
    appState.currentPage = pageId

    if (searchParams) {
        const urlSearchParams = new URLSearchParams('?' + searchParams);
        params = Object.fromEntries(urlSearchParams.entries());
    }
    if (params)
        appState.params = params
    switch (pageId) {
        case 'intern':
            if (params && params.id) {
                render.intern(params.id)
            }
            break;
    }
    switch (appState.lastPage) {
        case 'intern':
            routingAnimation.in = slideInRight;
            routingAnimation.out = slideOutRight;
            break;
    }
    switch (pageId) {
        case 'intern':
            routingAnimation.in = slideInLeft;
            routingAnimation.out = slideOutLeft;
            break;
    }
    if (appState.lastPage !== pageId) {
        document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'))
        getRef(pageId).closest('.page').classList.remove('hidden')
        if (appState.lastPage) {
            getRef(appState.lastPage).animate(routingAnimation.out, { duration: floGlobals.prefersReducedMotion ? 0 : 150, fill: 'forwards', easing: 'ease' }).onfinish = (e) => {
                e.target.effect.target.classList.add('hidden')
            }
        }
        getRef(pageId).classList.remove('hidden')
        getRef(pageId).animate(routingAnimation.in, { duration: floGlobals.prefersReducedMotion ? 0 : 150, fill: 'forwards', easing: 'ease' }).onfinish = (e) => {
            appState.lastPage = pageId
        }
    }
}
const slideInLeft = [
    {
        opacity: 0,
        transform: 'translateX(1rem)'
    },
    {
        opacity: 1,
        transform: 'translateX(0)'
    }
]
const slideOutLeft = [
    {
        opacity: 1,
        transform: 'translateX(0)'
    },
    {
        opacity: 0,
        transform: 'translateX(-1rem)'
    },
]
const slideInRight = [
    {
        opacity: 0,
        transform: 'translateX(-1rem)'
    },
    {
        opacity: 1,
        transform: 'translateX(0)'
    }
]
const slideOutRight = [
    {
        opacity: 1,
        transform: 'translateX(0)'
    },
    {
        opacity: 0,
        transform: 'translateX(1rem)'
    },
]
const slideInDown = [
    {
        opacity: 0,
        transform: 'translateY(-1rem)'
    },
    {
        opacity: 1,
        transform: 'translateY(0)'
    },
]
const slideOutDown = [
    {
        opacity: 1,
        transform: 'translateY(0)'
    },
    {
        opacity: 0,
        transform: 'translateY(1rem)'
    },
]
const slideInUp = [
    {
        opacity: 0,
        transform: 'translateY(1rem)'
    },
    {
        opacity: 1,
        transform: 'translateY(0)'
    },
]
const slideOutUp = [
    {
        opacity: 1,
        transform: 'translateY(0)'
    },
    {
        opacity: 0,
        transform: 'translateY(-1rem)'
    },
]
floGlobals.payer = 'FThgnJLcuStugLc24FJQggmp2WgaZjrBSn';
floGlobals.internTxs = new Map()
function formatAmount(amount = 0) {
    if (!amount)
        return '₹0';
    return amount.toLocaleString(`en-IN`, { style: 'currency', currency: 'inr' })
}
function fetchRibcData() {
    return floCloudAPI.requestObjectData("RIBC", {
        application: "InternManage",
        receiverID: "FMyRTrz9CG4TFNM6rCQgy3VQ5NF23bY2xD",
        senderID: ["FCja6sLv58e3RMy41T5AmWyvXEWesqBCkX", "FFS5hFXG7DBtdgzrLwixZLpenAmsCKRddm", "FS4jMAcSimRMrhoRhk5cjuJERS2otiwq4A"],
    })
}
function fetchTransactions() {
    return floBlockchainAPI
        .readAllTxs("FThgnJLcuStugLc24FJQggmp2WgaZjrBSn")
        .then(({ items }) => items)
}
const render = {
    internCard(floId) {
        const { total, txs } = floGlobals.internTxs.get(floId);
        return html`
            <li class="intern-card">
                <div class="flex flex-direction-column gap-0-5">
                    <h3>${floGlobals.appObjects.RIBC.internList[floId]}</h3>
                    <sm-copy value=${floId}></sm-copy>
                </div>
                <div class="flex flex-direction-column">
                    <p>Last payment: <b>${formatAmount(txs[0].amount)}</b> on ${getFormattedTime(txs[0].time, 'date-only')}</p>
                    <p>Total paid: <b>${formatAmount(total)}</b></p>
                </div>
                <a href=${`#/intern?id=${floId}`} class="button button--small button--colored margin-left-auto">
                    View details
                    <svg class="icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"/></svg>
                </a>
            </li>
        `;
    },
    internPaymentList() {
        const renderedList = []
        floGlobals.internTxs.forEach((data, internId) => {
            renderedList.push(render.internCard(internId));
        })
        renderElem(getRef("intern_payment_list"), html`${renderedList}`);
    },
    paymentCard(tx) {
        const { txid, amount, time } = tx;
        return html`
            <li class="payment-card">
                <time>${getFormattedTime(time, 'date-only')}</time>
                <div class="flex align-items-center space-between">
                    <p class="amount">${formatAmount(amount)}</p>
                    <a class="button button--small button--colored" href=${`https://flosight.duckdns.org/tx/${txid}`} target="_blank"
                        rel="noopener noreferrer">
                        <svg class="icon margin-right-0-5" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24"
                                                width="24px" fill="#000000">
                            <path d="M0 0h24v24H0z" fill="none"></path> <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"> </path>
                        </svg>
                        View transaction
                    </a>
                </div>
            </li>
        `;
    },
    intern(floId) {
        renderElem(getRef('intern'), html`
            <a href="#/home" class="button button--colored margin-right-auto back-button">
                <svg class="icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none" opacity=".87"/><path d="M17.51 3.87L15.73 2.1 5.84 12l9.9 9.9 1.77-1.77L9.38 12l8.13-8.13z"/></svg>
                Back    
            </a>
            <section id="intern__details" class="flex flex-direction-column gap-1">
                <h1>${floGlobals.appObjects.RIBC.internList[floId]}</h1>
                <div>
                    <p style="font-size: 0.9rem;">FLO Address</p>
                    <sm-copy value=${floId}></sm-copy>
                </div>
                <p>Total paid: <b>${formatAmount(floGlobals.internTxs.get(floId).total)}</b></p>
            </section>
            <section class="flex flex-direction-column gap-1">
                <h4>Payment history</h4>
                <ul id="payment_history">
                    ${floGlobals.internTxs.get(floId).txs.map(tx => render.paymentCard(tx))}
                </ul>
            </section>
        `)
    }
}
const oldInterns = {
    "FEvLovuDjWo4pXX3Y4SKDh8sq1AxJzqz9Z": "Megha Rani",
    "F765ofUHBhfXhvzrSgnPjvCvJXXCpoW6be": "Madhu Verma",
    "FHZtDh1NPepaPbbPwW65GjnDdVV1uo8NSA": "Vridhi Raj",
    "FKa43RxHUAdJbgV6KipQ4PvXi6Kgw4HmFn": "Aakriti Sinha",
    "FFaB6N1ETZsykXVS2PdM5xhj5BBoqsfsXC": "Ritika Agrawal",
    "FSdjJCJdU43a1dyWY6dRES1ekoupEjFPqQ": "Muskan Kumari",
    "FK96PZh4NskoJfWoyqcvLpSo7YnTLWMmdD": "Shambhavi Singh",
    "FJK9EDGhKj4Wr2zeCo3zRPXCNU6CXFFQAN": "Shivam Kumar Pandey",
    "FPtrQK6aSCgFeSNpzC68YTznHPfiz7CCvW": "Shruti Kashyap",
    "FHWXdnjRRJErqazye4Y9MRmE42D4Bp6Bj7": "Rashi Sanghvi",
    "FCTGD4M3DvMKupX3j2y5f3cQNDD9i6LUp7": "Gunjan Kumar Ranjan",
    "F8zYh6rCuorGmnMtqGFpaKGeBqQaj9WVtG": "Kriti Shreya",
    "FFoVnVMJv8BTfbk7ij9T5jPHs7VKSz886A": "Jaidev",
    "F87Ai2ErAMFe3UmAR7S63UYX2jE9ofaXSH": "Keerthana A V",
    "FEzy6pzEkm1TMXf1BGQz8dXvVZM3L1HFu2": "Saloni Jaitley",
    "FB4tu13HCxHAadvUDmgDBhvE9MtCkgRacn": "Divyansh Bhardwaj",
    "FLzcrXhzK1XzLnku5sT6yzURBcqQ5ZDNJy": "Tanishk Goyal",
    "F7HVKrF68Y6YKE9XXpHhAcxt6MwRLcUD67": "Salomi Sarkar",
    "FBYnAqhBt99XbTtCH6LAzjJ5yNZVPkYXhk": "Divyansh Bhardwaj (New FLO ID)",
    "FF7jVqwGS8fGG9fxmbVkEvD1Qo11hDyg8b": "Ahana Chakraborty",
    "FKknmmQd3PVaGbBbPFAJcQsARvw48NfeDF": "Prattay Mazumdar",
    "FSoa46pVWsNuZDp26X9H9Fi6ijMk7cy7mc": "Jayant Kumar",
    "FCqLr9nymnbh7ahta1gGC78z634y4GHJGQ": "Rakhijeet Singh",
    "FEHKFxQxycsxw2qQQSn2Y1BCT6Mfb8EMko": "Abhijeet Anand",
}
function getInputAddresses(tx) {
  const ins = tx?.vin || [];
  const out = [];
  for (const v of ins) {
    // Blockbook puts addresses in vin[i].addresses
    const addrs = v?.addresses || (v?.addr ? [v.addr] : []);
    for (const a of addrs) if (a) out.push(a);
  }
  return out;
}
function isFromPayer(tx) {
  const ins = getInputAddresses(tx);
  // Must have at least one input AND all inputs must be the cashier
  return ins.length > 0 && ins.every(a => a === floGlobals.payer);
}
function getReceiverAddress(vout) {
    // return the first address in outputs that isn't the payer
    for (const output of vout) {
        const addrs = output?.scriptPubKey?.addresses || [];
        for (const address of addrs) {
            if (address && address !== floGlobals.payer) return address;
        }
    }
    return undefined; // no distinct receiver (shouldn't happen for payments)
}
        
function parseFloAmount(floData) {
    // matches "send 3000 rupee#" or "send 8000.0000000000 rupee#"
    const m = /send\s+([\d.]+)\s+[A-Za-z0-9#]+/i.exec(floData || "");
    return m ? parseFloat(m[1]) : 0;
}
function main() {
    return Promise.all([fetchTransactions(), fetchRibcData()]).then(([txs]) => {
        console.log(floGlobals.appObjects.RIBC.internList)
        floGlobals.appObjects.RIBC.internList = {
            ...floGlobals.appObjects.RIBC.internList,
            ...oldInterns
        }
        txs.forEach((tx) => {
            if (!isFromPayer(tx)) { return; }
            const floId = getReceiverAddress(tx.vout);
            if (!floGlobals.appObjects.RIBC.internList[floId]) return; // not an intern
            const { txid, floData, time } = tx
            if (!floGlobals.internTxs.has(floId))
                floGlobals.internTxs.set(floId, {
                    total: 0,
                    txs: []
                });
            const amount = parseFloAmount(floData); // get amount from floData
            floGlobals.internTxs.get(floId).total += amount;
            floGlobals.internTxs.get(floId).txs.push({
                txid,
                amount,
                time
            });

        });
        floGlobals.internTxs.forEach((intern) => {
            intern.txs.sort((a, b) => b.time - a.time)
        })
        // sort floGlobals.internTxs by date of last payment
        floGlobals.internTxs = new Map([...floGlobals.internTxs.entries()].sort((a, b) => b[1].txs[0].time - a[1].txs[0].time));
        render.internPaymentList();
        routeTo(window.location.hash)
    }).catch(err => {
        notify(`Error fetching data: ${err}`, "error")
    })
}
