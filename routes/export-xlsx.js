const express = require('express');
const axios = require('axios');
const XLSX = require('xlsx');
const router = express.Router();
const { formatCustomDate, formatSupplySum } = require('../utils/functions');

router.post('/', async (req, res) => {
  const { token, dateFrom, dateTo, productsData = [], ingredientsData = [], storesData = [] } = req.body;
  const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3000';
  // Input validation
  if (!token || !dateFrom || !dateTo) {
    console.error('Missing required parameters:', { token, dateFrom, dateTo });
    return res.status(400).json({ error: 'Token, dateFrom, and dateTo are required' });
  }

  try {
    // Fetch export data
    const response = await axios.get(`${baseUrl}/api/poster/fetch-export-data`, {
      params: { token, dateFrom, dateTo },
    }).catch(err => {
      throw new Error(`Failed to fetch export data: ${err.message}`);
    });

    let { suppliesData = [], movesData = [], wastesData = [] } = response.data;

    // Supplies ma'lumotlarini qayta ishlash
    suppliesData = await Promise.all(
      suppliesData.map(async (item) => {
        try {
          const dataFetch = await axios.get(`${baseUrl}/api/poster/fetch-poster-api`, {
            params: { token, endpoint: 'storage.getSupply', supply_id: item.supply_id },
          }).catch(err => {
            throw new Error(`Failed to fetch supply data for supply_id ${item.supply_id}: ${err.message}`);
          });

          const fullSupply = { ...dataFetch.data.response, storage_name: item.storage_name };
          const ingredients = fullSupply.ingredients || [];

          return ingredients.map((element) => {
            let findRest;
            const findStore = storesData.find((store) => store.storage_id == fullSupply.storage_id) || {};
            if (element?.type == '10') {
              findRest = ingredientsData.find((ingredient) => ingredient.ingredient_id == element.ingredient_id) || {};
              return {
                ...fullSupply,
                ...element,
                ...findRest,
                ingredient_unit: element?.ingredient_unit == 'kg' ? 'кг' : element?.ingredient_unit == 'p' ? 'шт' : 'л',
                storage_name: findStore.storage_name || 'Unknown',
              };
            } else {
              findRest = productsData.find((product) => product.product_id == element.product_id) || {};
              const findIngredient = ingredientsData.find((ing) => ing.ingredient_id == element?.ingredient_id) || {};
              return {
                ...element,
                ...findRest,
                ...fullSupply,
                ...findIngredient,
                ingredient_unit: element?.ingredient_unit == 'kg' ? 'кг' : element?.ingredient_unit == 'p' ? 'шт' : 'л',
                storage_name: findStore.storage_name || 'Unknown',
              };
            }
          });
        } catch (err) {
          console.error(`Error processing supply item ${item.supply_id}:`, err.message);
          return [];
        }
      })
    ).then((results) => results.flat());

    // Moves ma'lumotlarini qayta ishlash
    movesData = await Promise.all(
      movesData.map(async (item) => {
        try {
          const dataFetch = await axios.get(`${baseUrl}/api/poster/fetch-poster-api`, {
            params: { token, endpoint: 'storage.getMove', move_id: item.moving_id },
          }).catch(err => {
            throw new Error(`Failed to fetch move data for move_id ${item.moving_id}: ${err.message}`);
          });

          const fullMoves = Array.isArray(dataFetch.data.response) ? dataFetch.data.response[0] || {} : dataFetch.data.response || {};
          const ingredients = fullMoves.ingredients || [];

          return ingredients.map((element) => {
            let findRest;
            const findStore = storesData.find((store) => store.storage_id == fullMoves.storage_id) || {};
            if (element?.type == '10') {
              findRest = ingredientsData.find((ingredient) => ingredient.ingredient_id == element.ingredient_id) || {};
              return {
                ...fullMoves,
                ...element,
                ...findRest,
                ingredient_unit: findRest?.ingredient_unit == 'kg' ? 'кг' : findRest?.ingredient_unit == 'p' ? 'шт' : 'л',
                storage_name: findStore.storage_name || 'Unknown',
              };
            } else {
              findRest = productsData.find((product) => product.product_id == element.product_id) || {};
              const findIngredient = ingredientsData.find((ing) => ing.ingredient_id == element?.ingredient_id) || {};
              return {
                ...element,
                ...findRest,
                ...fullMoves,
                ...findIngredient,
                ingredient_unit: findIngredient?.unit == 'kg' ? 'кг' : findIngredient?.unit == 'p' ? 'шт' : 'л',
                storage_name: findStore.storage_name || 'Unknown',
              };
            }
          });
        } catch (err) {
          console.error(`Error processing move item ${item.moving_id}:`, err.message);
          return [];
        }
      })
    ).then((results) => results.flat());

    // Wastes ma'lumotlarini qayta ishlash
    wastesData = await Promise.all(
      wastesData.map(async (item) => {
        try {
          const dataFetch = await axios.get(`${baseUrl}/api/poster/fetch-poster-api`, {
            params: { token, endpoint: 'storage.getWaste', waste_id: item.waste_id },
          }).catch(err => {
            throw new Error(`Failed to fetch waste data for waste_id ${item.waste_id}: ${err.message}`);
          });

          const fullWastes = dataFetch.data.response || {};
          const elements = fullWastes.elements || [];

          return elements.map((element) => {
            let findRest;
            const findStore = storesData.find((store) => store.storage_id == fullWastes.storage_id) || {};
            if (element?.type == '10') {
              findRest = ingredientsData.find((ingredient) => ingredient.ingredient_id == element.ingredient_id) || {};
              return {
                ...fullWastes,
                ...element,
                ...findRest,
                ingredient_unit: findRest?.ingredient_unit == 'kg' ? 'кг' : findRest?.ingredient_unit == 'p' ? 'шт' : 'л',
                storage_name: findStore.storage_name || 'Unknown',
              };
            } else {
              findRest = productsData.find((product) => product.product_id == element.product_id) || {};
              const findIngredient = ingredientsData.find((ing) => ing.ingredient_id == (element.ingredients && element.ingredients[0]?.ingredient_id)) || {};
              return {
                ...element,
                ...findRest,
                ...fullWastes,
                ...findIngredient,
                ingredient_unit: findIngredient?.unit == 'kg' ? 'кг' : findIngredient?.unit == 'p' ? 'шт' : 'л',
                storage_name: findStore.storage_name || 'Unknown',
              };
            }
          });
        } catch (err) {
          console.error(`Error processing waste item ${item.waste_id}:`, err.message);
          return [];
        }
      })
    ).then((results) => results.flat());

    const exportChunks = [
      {
        name: 'Поставки',
        headers: ['№', 'Дата', 'Поставщик', 'Товар', 'Кол-во', 'Ед. изм.', 'Сумма без НДС', 'Склад', 'Счёт', 'Сотрудник'],
        data: suppliesData.map((item) => [
          item.supply_id || '',
          formatCustomDate(String(item.date || new Date())),
          item.supplier_name || 'Unknown',
          item?.ingredient_name || 'Unknown',
          item?.supply_ingredient_num || 0,
          item?.ingredient_unit || 'Unknown',
          formatSupplySum(Number(item?.supply_ingredient_sum_netto || 0)) + ' СУМ',
          item.storage_name || 'Unknown',
          item.account_id || '',
          '',
        ]),
      },
      {
        name: 'Перемещения',
        headers: ['Дата', 'Наименование', 'Кол-во', 'Ед. изм.', 'Сумма без НДС', 'Комментарий', 'Склад отгрузки', 'Склад приемки', 'Сотрудник'],
        data: movesData.map((item) => [
          formatCustomDate(String(item.date || new Date())),
          item?.type == 10 ? item?.ingredient_name || 'Unknown' : item?.product_name || 'Unknown',
          item?.ingredient_num || 0,
          item?.ingredient_unit || 'Unknown',
          formatSupplySum(Number(item?.ingredient_sum_netto || 0)) + ' СУМ',
          '',
          item.to_storage_name || 'Unknown',
          item.from_storage_name || 'Unknown',
          item.user_name || 'Unknown',
        ]),
      },
      {
        name: 'Списания',
        headers: ['Дата', 'Склад', 'Что списывается', 'Кол-во', 'Ед-ца измерения', 'Сумма без НДС', 'Причина'],
        data: wastesData.map((item) => [
          formatCustomDate(String(item.date || new Date())),
          item.storage_name || 'Unknown',
          item?.type == 10 ? item?.ingredient_name || 'Unknown' : item?.product_name || 'Unknown',
          item?.type == 10 ? item?.ingredient_left || 0 : item?.count || 0,
          item?.ingredient_unit || 'Unknown',
          item?.type == 10 ? formatSupplySum(Number(item?.total_sum_netto || 0)) + ' СУМ' : formatSupplySum(Number(item?.cost_netto || 0)) + ' СУМ',
          item.reason_name || 'Unknown',
        ]),
      },
    ];

    const wb = XLSX.utils.book_new();
    const MAX_ROWS = 10000;

    let hasCombined = false;
    for (const { name, headers, data } of exportChunks) {
      if (data.length <= MAX_ROWS) {
        const sheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
        XLSX.utils.book_append_sheet(wb, sheet, name);
        hasCombined = true;
      }
    }

    if (hasCombined) {
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const encodedFilename = encodeURIComponent(`${dateFrom}-${dateTo}-Combined.xlsx`);
      res.set({
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      res.send(buf);
    } else {
      res.status(400).json({ error: 'No data to export' });
    }
  } catch (error) {
    console.error('Export error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to export data', details: error.message });
  }
});

module.exports = router;