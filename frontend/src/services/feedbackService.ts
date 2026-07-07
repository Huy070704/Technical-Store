import { api, unwrapApiData } from './api';

export interface FeedbackProduct {
  id: string;
  name?: string;
  slug?: string;
}

export interface FeedbackAccount {
  id: string;
  name?: string;
  email?: string;
  username?: string;
}

export interface Feedback {
  id: string;
  customerContent: string;
  rating: number;
  createdAt: string;
  updatedAt?: string;
  isHidden?: boolean;
  managerContent?: string | null;
  customer: FeedbackAccount;
  product?: FeedbackProduct;
  manager?: FeedbackAccount | null;
  order?: { id: string };
  images?: { id: string; url: string }[];
}

export interface FeedbackStatistics {
  total: number;
  visibleTotal: number;
  hiddenCount: number;
  repliedCount: number;
  averageRating: number;
  replyRate: number;
}

export interface FeedbackManagementParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  rating?: number;
  productId?: string;
  status?: 'all' | 'visible' | 'hidden' | 'replied' | 'unreplied';
  fromDate?: string;
  toDate?: string;
}

type FeedbacksPayload = { feedbacks?: Feedback[] };
type FeedbackPayload = { feedback?: Feedback };
type ManagementPayload = {
  data?: Feedback[];
  total?: number;
  page?: number;
  pageSize?: number;
};
type StatisticsPayload = { statistics?: FeedbackStatistics };

class FeedbackService {
  async getFeedbacksByProduct(productId: string): Promise<Feedback[]> {
    try {
      const response = await api.get(`/feedbacks/product/${productId}`);
      const data = unwrapApiData<FeedbacksPayload>(response);
      return Array.isArray(data?.feedbacks) ? data.feedbacks : [];
    } catch (error) {
      console.error('Error fetching feedbacks by product:', error);
      return [];
    }
  }

  async getManagementFeedbacks(params: FeedbackManagementParams = {}) {
    const response = await api.get('/feedbacks/management', { params });
    return unwrapApiData<ManagementPayload>(response);
  }

  async getFeedbackById(id: string): Promise<Feedback> {
    const response = await api.get(`/feedbacks/${id}`);
    const data = unwrapApiData<FeedbackPayload>(response);
    if (!data?.feedback) throw new Error('Feedback not found');
    return data.feedback;
  }

  async getStatistics(): Promise<FeedbackStatistics> {
    const response = await api.get('/feedbacks/statistics');
    const data = unwrapApiData<StatisticsPayload>(response);
    return data.statistics ?? {
      total: 0,
      visibleTotal: 0,
      hiddenCount: 0,
      repliedCount: 0,
      averageRating: 0,
      replyRate: 0,
    };
  }

  async createFeedback(input: {
    orderId: string;
    productId: string;
    rating: number;
    customerContent: string;
  }): Promise<Feedback> {
    const response = await api.post('/feedbacks', input);
    const data = unwrapApiData<FeedbackPayload>(response);
    if (!data?.feedback) throw new Error('Create feedback failed');
    return data.feedback;
  }

  async replyToFeedback(id: string, managerContent: string): Promise<Feedback> {
    const response = await api.patch(`/feedbacks/${id}/reply`, { managerContent });
    const data = unwrapApiData<FeedbackPayload>(response);
    if (!data?.feedback) throw new Error('Reply failed');
    return data.feedback;
  }

  async toggleHide(id: string, isHidden: boolean): Promise<Feedback> {
    const response = await api.patch(`/feedbacks/${id}/hide`, { isHidden });
    const data = unwrapApiData<FeedbackPayload>(response);
    if (!data?.feedback) throw new Error('Update failed');
    return data.feedback;
  }

  async deleteFeedback(id: string): Promise<void> {
    await api.delete(`/feedbacks/${id}`);
  }

  async getMyFeedbacks(): Promise<Feedback[]> {
    const response = await api.get('/feedbacks/my-feedbacks');
    const data = unwrapApiData<{ feedbacks?: Feedback[] }>(response);
    return Array.isArray(data?.feedbacks) ? data.feedbacks : [];
  }

  async uploadImage(file: File): Promise<{ url: string; id: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/image/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return unwrapApiData<{ url: string; id: string }>(response);
  }

  async attachToFeedback(feedbackId: string, urls: string[]): Promise<void> {
    await api.post('/image/attach-to-feedback', {
      query: feedbackId,
      imagesURL: urls.join(','),
    });
  }
}

export const feedbackService = new FeedbackService();
