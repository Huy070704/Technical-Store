import { api, unwrapApiData } from './api';

export interface Feedback {
  id: string;
  customerContent: string;
  rating: number;
  createdAt: string;
  customer: {
    id: string;
    name?: string;
    email?: string;
    username?: string;
  };
  images?: { id: string; url: string }[];
}

type FeedbacksPayload = { feedbacks?: Feedback[] };

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
}

export const feedbackService = new FeedbackService();
