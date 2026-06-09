import { AdminLayout } from '../../components/admin';

const AdminFacilityManagement = () => {
  return (
    <AdminLayout>
      <div className="flex w-full flex-col h-full">
        
{/*  Page Header  */}
<div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-xl">
<div>
<nav aria-label="Breadcrumb" className="flex text-secondary text-label-xs mb-xs">
<ol className="flex items-center space-x-2">
<li><a className="hover:text-primary transition-colors" href="#">Dashboard</a></li>
<li className="flex items-center space-x-2">
<span className="material-symbols-outlined text-[14px]" data-icon="chevron_right">chevron_right</span>
<span className="text-on-surface font-semibold">Facilities</span>
</li>
</ol>
</nav>
<h1 className="text-headline-xl font-headline-xl text-on-surface">Facilities Management</h1>
</div>
<button className="mt-4 md:mt-0 flex items-center gap-2 bg-primary hover:bg-primary-hover text-on-primary px-lg py-md rounded font-semibold transition-all shadow-md active:scale-95" onClick={() => {}}>
<span className="material-symbols-outlined" data-icon="add">add</span>
<span>Add Facility</span>
</button>
</div>
{/*  KPI Summary Cards (Bento Style)  */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg mb-xl">
<div className="bg-bg-card p-lg rounded-lg border border-slate-border shadow-md">
<div className="flex justify-between items-start mb-sm">
<div className="p-2 bg-surface-container-low rounded-lg">
<span className="material-symbols-outlined text-primary" data-icon="apartment">apartment</span>
</div>
<span className="text-tertiary font-label-md flex items-center gap-xs">
<span className="material-symbols-outlined text-sm" data-icon="trending_up">trending_up</span>
                            +12%
                        </span>
</div>
<h3 className="text-secondary text-label-md">Total Facilities</h3>
<p className="text-headline-xl font-headline-xl text-on-surface">142</p>
</div>
<div className="bg-bg-card p-lg rounded-lg border border-slate-border shadow-md">
<div className="flex justify-between items-start mb-sm">
<div className="p-2 bg-tertiary-fixed rounded-lg">
<span className="material-symbols-outlined text-on-tertiary-fixed" data-icon="check_circle">check_circle</span>
</div>
<span className="text-secondary text-label-md">Stable</span>
</div>
<h3 className="text-secondary text-label-md">Active</h3>
<p className="text-headline-xl font-headline-xl text-on-surface">138</p>
</div>
<div className="bg-bg-card p-lg rounded-lg border border-slate-border shadow-md">
<div className="flex justify-between items-start mb-sm">
<div className="p-2 bg-primary-light rounded-lg">
<span className="material-symbols-outlined text-error" data-icon="cancel">cancel</span>
</div>
<span className="text-error font-label-md flex items-center gap-xs">
<span className="material-symbols-outlined text-sm" data-icon="warning">warning</span>
                            4 Critical
                        </span>
</div>
<h3 className="text-secondary text-label-md">Inactive</h3>
<p className="text-headline-xl font-headline-xl text-on-surface">4</p>
</div>
<div className="bg-bg-card p-lg rounded-lg border border-slate-border shadow-md">
<div className="flex justify-between items-start mb-sm">
<div className="p-2 bg-secondary-fixed rounded-lg">
<span className="material-symbols-outlined text-on-secondary-fixed" data-icon="groups">groups</span>
</div>
<span className="text-tertiary font-label-md flex items-center gap-xs">
<span className="material-symbols-outlined text-sm" data-icon="trending_up">trending_up</span>
                            +8
                        </span>
</div>
<h3 className="text-secondary text-label-md">Assigned Staff</h3>
<p className="text-headline-xl font-headline-xl text-on-surface">2,840</p>
</div>
</div>
{/*  Search and Filters  */}
<div className="bg-bg-card p-md rounded-lg border border-slate-border shadow-md mb-lg flex flex-col lg:flex-row gap-md items-end">
<div className="flex-1 w-full lg:w-auto">
<label className="font-label-md text-secondary block mb-xs">Search Facility</label>
<div className="relative">
<span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary" data-icon="search">search</span>
<input className="w-full pl-10 pr-4 py-2 bg-white border border-slate-border rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Search by name or ID..." type="text"/>
</div>
</div>
<div className="w-full lg:w-48">
<label className="font-label-md text-secondary block mb-xs">Status</label>
<select className="w-full px-4 py-2 bg-white border border-slate-border rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
<option>All Statuses</option>
<option>Active</option>
<option>Inactive</option>
<option>Maintenance</option>
</select>
</div>
<div className="w-full lg:w-48">
<label className="font-label-md text-secondary block mb-xs">Location</label>
<select className="w-full px-4 py-2 bg-white border border-slate-border rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
<option>All Locations</option>
<option>North Region</option>
<option>South Region</option>
<option>West Coast</option>
<option>East Coast</option>
</select>
</div>
<button className="w-full lg:w-auto px-lg py-2 border border-slate-border rounded text-secondary hover:bg-surface-container-low transition-colors font-semibold flex items-center justify-center gap-2">
<span className="material-symbols-outlined text-[18px]" data-icon="restart_alt">restart_alt</span>
                    Reset
                </button>
</div>
{/*  Facilities Table  */}
<div className="bg-bg-card rounded-lg border border-slate-border shadow-md overflow-hidden">
<div className="overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead className="bg-surface-container-low">
<tr>
<th className="px-lg py-4 font-label-md text-secondary border-b border-slate-border">Facility ID</th>
<th className="px-lg py-4 font-label-md text-secondary border-b border-slate-border">Name</th>
<th className="px-lg py-4 font-label-md text-secondary border-b border-slate-border">Location</th>
<th className="px-lg py-4 font-label-md text-secondary border-b border-slate-border">Manager</th>
<th className="px-lg py-4 font-label-md text-secondary border-b border-slate-border">Staff Count</th>
<th className="px-lg py-4 font-label-md text-secondary border-b border-slate-border">Status</th>
<th className="px-lg py-4 font-label-md text-secondary border-b border-slate-border text-right">Actions</th>
</tr>
</thead>
<tbody className="divide-y divide-slate-border">
{/*  Row 1  */}
<tr className="hover:bg-surface-container-low transition-colors group">
<td className="px-lg py-4 text-body-md font-medium">FAC-8902</td>
<td className="px-lg py-4 text-body-md">Chicago Flagship</td>
<td className="px-lg py-4 text-body-md text-secondary">Chicago, IL</td>
<td className="px-lg py-4">
<div className="flex items-center gap-2">
<img alt="Manager" className="w-6 h-6 rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8oR98PXyeBlFaY6O1A8VbrIuX7MzmZ505TbfdBLRxbLkgk2IPMQHjwNclIz9rBQxZ63C4qK4MpuWp6nOEySDwwEBcfpzWHT8Vb67ZVAGGjoGex4QPSQcoz2zznYeCQm43wfH70pKUqK0Cucf9xRGA7PTmzfwiGw7r0K1wDgxmOG4VG0aEr_fRRTKV1UEpCAAPWQBapSQgq5VtbcKmAQ8Ny-aukBC6Vwrtwj-RiVdmaodGBazVxim4SAYAG7fL9OPvzgDWKhRvVjwZ"/>
<span className="text-body-md">Michael Chen</span>
</div>
</td>
<td className="px-lg py-4 text-body-md">142</td>
<td className="px-lg py-4">
<span className="px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed rounded-full text-label-xs">Active</span>
</td>
<td className="px-lg py-4 text-right">
<div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button className="p-1 hover:text-primary transition-colors" onClick={() => {}}><span className="material-symbols-outlined" data-icon="visibility">visibility</span></button>
<button className="p-1 hover:text-primary transition-colors"><span className="material-symbols-outlined" data-icon="edit">edit</span></button>
<button className="p-1 hover:text-error transition-colors"><span className="material-symbols-outlined" data-icon="delete">delete</span></button>
</div>
</td>
</tr>
{/*  Row 2  */}
<tr className="bg-bg-soft/20 hover:bg-surface-container-low transition-colors group">
<td className="px-lg py-4 text-body-md font-medium">FAC-7123</td>
<td className="px-lg py-4 text-body-md">Dallas Distribution Center</td>
<td className="px-lg py-4 text-body-md text-secondary">Dallas, TX</td>
<td className="px-lg py-4">
<div className="flex items-center gap-2">
<img alt="Manager" className="w-6 h-6 rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJdK2FIy8Qq3rq6O5wGKk0QDSJP56R430SagatQC6cbdmjEcRpVuxUvVWSY2iPax84JZPzGTHwGVygl5bdvRLfdCIgdvEtB50e2ZsT7P8lHBb8xzRsJrXLOdi9ETgSPu27-DBn4qwmaFrotp1yk49q3ZNk5rIB2ai_N1w_keKX76BYzliec-jMgWpwTGltDaaG7_MODb0fe9BNIbQhwLIW_R9oOKF5iKk9TSiY-q3r5fpIQUoSNT0_lGMOcsALFtwMVPCwvybOFsME"/>
<span className="text-body-md">Sarah Jenkins</span>
</div>
</td>
<td className="px-lg py-4 text-body-md">450</td>
<td className="px-lg py-4">
<span className="px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed rounded-full text-label-xs">Active</span>
</td>
<td className="px-lg py-4 text-right">
<div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button className="p-1 hover:text-primary transition-colors" onClick={() => {}}><span className="material-symbols-outlined" data-icon="visibility">visibility</span></button>
<button className="p-1 hover:text-primary transition-colors"><span className="material-symbols-outlined" data-icon="edit">edit</span></button>
<button className="p-1 hover:text-error transition-colors"><span className="material-symbols-outlined" data-icon="delete">delete</span></button>
</div>
</td>
</tr>
{/*  Row 3  */}
<tr className="hover:bg-surface-container-low transition-colors group">
<td className="px-lg py-4 text-body-md font-medium">FAC-3341</td>
<td className="px-lg py-4 text-body-md">Miami Waterfront Store</td>
<td className="px-lg py-4 text-body-md text-secondary">Miami, FL</td>
<td className="px-lg py-4">
<div className="flex items-center gap-2">
<img alt="Manager" className="w-6 h-6 rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJXREL3ZKgF57sUwb_1xS-Y_sbMZtSM4giLx80UXhy2i3JUvNC93IVrUUhvUUQSMNxMyBYFE_YK7W-SvmH0LHU0rj7IqmSa355pINIsVrEpTTsm1yPAjmi0QuDdUIyjCZ-GM1MI6ITl21hEvfp62P7Fcf_Jftn08eeaESqhUQ9Qs8yhYcVosneS67Oa1rEOHP0VxXEQLUbeYSpoXzuCGefbkNVnD4fDPWsnM1yyXTD2pf6nz0thnAZWRqH43dbFA3JE-SHG10itDW1"/>
<span className="text-body-md">Robert Diaz</span>
</div>
</td>
<td className="px-lg py-4 text-body-md">0</td>
<td className="px-lg py-4">
<span className="px-3 py-1 bg-primary-light text-primary rounded-full text-label-xs">Inactive</span>
</td>
<td className="px-lg py-4 text-right">
<div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button className="p-1 hover:text-primary transition-colors" onClick={() => {}}><span className="material-symbols-outlined" data-icon="visibility">visibility</span></button>
<button className="p-1 hover:text-primary transition-colors"><span className="material-symbols-outlined" data-icon="edit">edit</span></button>
<button className="p-1 hover:text-error transition-colors"><span className="material-symbols-outlined" data-icon="delete">delete</span></button>
</div>
</td>
</tr>
</tbody>
</table>
</div>
<div className="px-lg py-md bg-surface-container-lowest border-t border-slate-border flex justify-between items-center">
<span className="text-label-xs text-secondary">Showing 1-10 of 142 facilities</span>
<div className="flex gap-2">
<button className="p-1 border border-slate-border rounded hover:bg-surface-container-low transition-colors disabled:opacity-50" disabled>
<span className="material-symbols-outlined" data-icon="chevron_left">chevron_left</span>
</button>
<button className="w-8 h-8 flex items-center justify-center bg-primary text-on-primary rounded font-label-md">1</button>
<button className="w-8 h-8 flex items-center justify-center hover:bg-surface-container-low border border-transparent rounded font-label-md transition-colors">2</button>
<button className="w-8 h-8 flex items-center justify-center hover:bg-surface-container-low border border-transparent rounded font-label-md transition-colors">3</button>
<button className="p-1 border border-slate-border rounded hover:bg-surface-container-low transition-colors">
<span className="material-symbols-outlined" data-icon="chevron_right">chevron_right</span>
</button>
</div>
</div>
</div>

      </div>
    </AdminLayout>
  );
};

export default AdminFacilityManagement;
