import { useState } from 'react';
import type { Facility } from '@/services/facilityService';
import MaterialIcon from '../shared/MaterialIcon';

type FacilityTableProps = {
  facilities: Facility[];
  onViewClick: (facility: Facility) => void;
  onEditClick: (facility: Facility) => void;
  onBlockToggle: (facility: Facility) => void;
};

const ITEMS_PER_PAGE = 10;
const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=e2e8f0&color=475569&name=';
const shortId = (id: string) => `FAC-${id.slice(-4).toUpperCase()}`;

const FacilityTable = ({ facilities, onViewClick, onEditClick, onBlockToggle }: FacilityTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalItems = facilities.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  
  const currentFacilities = facilities.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-border/50 bg-bg-card shadow-md">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-border bg-bg-soft">
              {['Cơ sở', 'Địa điểm', 'Quản lý', 'Số nhân viên', 'Trạng thái', 'Hành động'].map((header) => (
                <th
                  key={header}
                  className={`px-lg py-md text-label-md uppercase text-secondary ${
                    header === 'Hành động' ? 'text-center' : ''
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-border/30">
            {currentFacilities.map((facility) => {
              const isActive = facility.isActive;
              const statusText = isActive ? 'Hoạt động' : 'Đã khóa';
              const statusColor = isActive ? 'bg-success' : 'bg-error';

              return (
                <tr key={facility.id} className="transition-colors hover:bg-surface-container-low">
                  <td className="px-lg py-md">
                    <div className="flex items-center gap-md">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
                        <MaterialIcon name="apartment" />
                      </div>
                      <div>
                        <div className="text-label-md text-on-surface">{facility.name || 'Chưa cập nhật'}</div>
                        <div className="text-body-sm text-secondary font-mono">{shortId(facility.id)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-lg py-md text-body-sm text-on-surface">{facility.address || '—'}</td>
                  <td className="px-lg py-md text-body-sm text-on-surface">
                    {facility.manager ? (
                        <div className="flex items-center gap-2">
                        <img alt="Manager" className="w-6 h-6 rounded-full object-cover" src={facility.manager.avatar || `${DEFAULT_AVATAR}${encodeURIComponent(facility.manager.name ?? 'NA')}`}/>
                        <span className="text-body-md">{facility.manager.name ?? '—'}</span>
                        </div>
                    ) : (
                        <span className="text-body-md text-secondary">Chưa phân công</span>
                    )}
                  </td>
                  <td className="px-lg py-md text-body-sm text-on-surface">{facility.staffCount}</td>
                  <td className="px-lg py-md">
                    <div className="flex items-center gap-xs">
                      <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                      <span className="text-label-md text-on-surface">{statusText}</span>
                    </div>
                  </td>
                  
                  <td className="px-lg py-md text-center">
                    <div className="flex items-center justify-center gap-x-xs">
                      <button
                        aria-label={`Xem chi tiết ${facility.name}`}
                        className="rounded p-xs text-secondary transition-all hover:bg-bg-soft hover:text-on-surface"
                        type="button"
                        onClick={() => onViewClick(facility)}
                      >
                        <MaterialIcon name="visibility" />
                      </button>
                      <button
                        aria-label={`Sửa ${facility.name}`}
                        className="rounded p-xs text-secondary transition-all hover:bg-primary-light hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-secondary"
                        type="button"
                        onClick={() => onEditClick(facility)}
                      >
                        <MaterialIcon name="edit" />
                      </button>

                      <button
                        aria-label={!facility.isActive ? `Mở khóa ${facility.name}` : `Khóa ${facility.name}`}
                        className={`rounded p-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-secondary ${
                          !facility.isActive
                            ? 'text-success hover:bg-success/15 hover:text-success-hover'
                            : 'text-secondary hover:bg-error-container hover:text-error'
                        }`}
                        type="button"
                        onClick={() => onBlockToggle(facility)}
                      >
                        <MaterialIcon name={!facility.isActive ? 'lock_open' : 'block'} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-md border-t border-slate-border/50 bg-surface-container-low px-lg py-md sm:flex-row sm:items-center sm:justify-between">
        <span className="text-body-sm text-secondary">
          Hiển thị từ {totalItems === 0 ? 0 : indexOfFirstItem + 1} đến {Math.min(indexOfLastItem, totalItems)} trong tổng số {totalItems} cơ sở
        </span>
        
        <div className="flex items-center gap-xs">
          <PaginationIcon 
            icon="chevron_left" 
            label="Trang trước" 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          />
          
          {Array.from({ length: totalPages }, (_, index) => {
            const pageNumber = index + 1;
            return (
              <button
                key={pageNumber}
                onClick={() => handlePageChange(pageNumber)}
                className={`rounded-lg px-sm py-1 text-label-md transition-colors ${
                  currentPage === pageNumber
                    ? 'bg-primary text-on-primary'
                    : 'text-secondary hover:bg-bg-soft'
                }`}
                type="button"
              >
                {pageNumber}
              </button>
            );
          })}

          <PaginationIcon 
            icon="chevron_right" 
            label="Trang sau" 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          />
        </div>
      </div>
    </section>
  );
};

type PaginationIconProps = {
  icon: string;
  label: string;
  onClick: () => void;
  disabled: boolean;
};

const PaginationIcon = ({ icon, label, onClick, disabled }: PaginationIconProps) => (
  <button 
    aria-label={label} 
    onClick={onClick}
    disabled={disabled}
    className="rounded-lg p-sm text-secondary transition-colors hover:bg-bg-soft disabled:opacity-30 disabled:cursor-not-allowed" 
    type="button"
  >
    <MaterialIcon name={icon} />
  </button>
);

export default FacilityTable;
