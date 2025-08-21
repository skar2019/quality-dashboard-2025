from transformers import BartForConditionalGeneration, BartTokenizer
import torch
from app.config.settings import settings
import logging

logger = logging.getLogger(__name__)

class SummarizationService:
    def __init__(self):
        self.model_name = settings.summarization_model_name
        self.tokenizer = None
        self.model = None
        
    def load_model(self):
        """Load the model and tokenizer if not already loaded"""
        if self.tokenizer is None:
            logger.info(f"Loading tokenizer for model: {self.model_name}")
            self.tokenizer = BartTokenizer.from_pretrained(
                self.model_name,
                cache_dir=settings.cache_dir
            )
        if self.model is None:
            logger.info(f"Loading model: {self.model_name}")
            self.model = BartForConditionalGeneration.from_pretrained(
                self.model_name,
                cache_dir=settings.cache_dir
            )
            
    def summarize(self, text: str, max_length: int = None, min_length: int = None) -> str:
        """
        Summarize the given text using BART model
        
        Args:
            text (str): Input text to summarize
            max_length (int): Maximum length of the summary
            min_length (int): Minimum length of the summary
            
        Returns:
            str: Generated summary
        """
        # Use settings defaults if not provided
        max_length = max_length or settings.default_max_length
        min_length = min_length or settings.default_min_length
        
        self.load_model()
        
        # Encode the text
        inputs = self.tokenizer(
            [text], 
            max_length=settings.summarization_max_input_length, 
            truncation=True, 
            return_tensors="pt"
        )
        
        # Generate summary
        summary_ids = self.model.generate(
            inputs["input_ids"],
            max_length=max_length,
            min_length=min_length,
            length_penalty=settings.summarization_length_penalty,
            num_beams=settings.summarization_num_beams,
            early_stopping=settings.summarization_early_stopping
        )
        
        # Decode the generated summary
        summary = self.tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        
        return summary 